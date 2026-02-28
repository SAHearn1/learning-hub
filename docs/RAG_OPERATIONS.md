# RAG Operations Guide

**Version:** 1.0.0
**Date:** 2026-02-28
**Audience:** Platform engineers, on-call operators

This document covers operational procedures for the RAG (Retrieval-Augmented Generation) pipeline: curriculum ingestion, IEP document processing, vector store management, and embedding operations.

---

## System Overview

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    RootWork RAG Stack                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Curriculum                      IEP Documents          │
│  ──────────                      ─────────────          │
│  POST /api/ingest                POST /api/iep/ingest   │
│        │                               │                │
│  parseCurriculumFile()          parseIepSections()       │
│        │                        processIepDocument()    │
│        │                               │                │
│  generateEmbeddings()           generateEmbeddings()    │
│  (text-embedding-3-small)       (text-embedding-3-small)│
│        │                               │                │
│        ▼                               ▼                │
│  Pinecone (default NS)         Pinecone (iep-documents) │
│        │                               │                │
│        └───────────┬───────────────────┘                │
│                    │                                    │
│             Context Window Manager                      │
│             buildOptimizedContext()                     │
│                    │                                    │
│             Anthropic Claude API                        │
└─────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/app/api/ingest/route.ts` | Curriculum ingestion endpoint (N8N webhook) |
| `src/app/api/iep/ingest/route.ts` | IEP document ingestion endpoint |
| `src/lib/curriculum/parser.ts` | Markdown → chunks for curriculum |
| `src/lib/rag/iep-document-processor.ts` | IEP sections → chunks |
| `src/lib/rag/iep-ingest-api.ts` | Orchestrates IEP chunking + indexing |
| `src/lib/rag/iep-vector-store.ts` | Pinecone ops for IEP namespace |
| `src/lib/rag/context-window-manager.ts` | Token budget allocation at query time |
| `src/lib/embeddings.ts` | OpenAI embedding generation |
| `src/lib/pinecone.ts` | Curriculum Pinecone client + upsert/query |
| `src/lib/vector-search.ts` | High-level vector search with caching |
| `src/lib/hybrid-search.ts` | Hybrid keyword + vector search (Supabase) |

---

## 1. Curriculum Ingestion

### 1.1 Trigger Methods

**Automated (daily):**
- GitHub Actions `trigger-ingest.yml` → runs at 02:00 UTC
- Calls N8N webhook → N8N calls `POST /api/ingest`

**Manual trigger via GitHub Actions:**
```
GitHub → Actions → trigger-ingest → Run workflow (select main branch)
```

**Manual API call:**
```bash
curl -X POST https://<production-url>/api/ingest \
  -H "Authorization: Bearer ${N8N_WEBHOOK_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"source": "MANUAL"}'
```

**With explicit file list:**
```bash
curl -X POST https://<production-url>/api/ingest \
  -H "Authorization: Bearer ${N8N_WEBHOOK_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "WEBHOOK",
    "files": [
      {
        "path": "content/14-financial-literacy/ch01-introduction.md",
        "metadata": { "subject": "FINANCIAL_LITERACY", "gradeLevel": [9, 10, 11, 12] }
      }
    ]
  }'
```

### 1.2 Idempotency

The ingest endpoint computes a SHA-256 hash (`contentHash`) of the file paths + file contents. If a `SUCCESS` log exists for the same hash, the request is skipped:

```json
{ "success": true, "skipped": true, "reason": "identical_payload", "previousLogId": "clx..." }
```

**Forcing re-ingest (e.g. after embedding model change):**

To override the idempotency check and force re-ingestion even for unchanged content, temporarily clear the `contentHash` on recent SUCCESS logs:

```sql
-- Run on production DB via admin access (irreversible — take backup first)
UPDATE "IngestLog" SET "contentHash" = NULL WHERE status = 'SUCCESS' AND "createdAt" > NOW() - INTERVAL '7 days';
```

Then re-trigger ingestion normally.

### 1.3 Chunk ID Format

Curriculum chunks use deterministic IDs based on file path and chunk index:

```
Financial literacy: finlit-{chapter}-{index:04d}
  e.g. finlit-ch01-0000, finlit-ch01-0001

Other content: {sanitised-path}-chunk-{index}
  e.g. content-science-grade-7-ch02-intro-chunk-0
```

Deterministic IDs mean Pinecone upsert semantics handle updates without duplication — re-ingesting the same file with the same chunk count overwrites existing vectors.

### 1.4 Adding New Curriculum Content

1. Place new markdown files in `content/<collection-name>/`
2. Ensure files have clear `##`/`###` section headings for optimal chunking
3. Update `defaultFinancialLiteracyFiles()` or provide explicit `files` array in the ingest request with appropriate metadata:
   ```json
   {
     "subject": "MATH",
     "gradeLevel": [6, 7, 8],
     "gradeBand": "MS",
     "standardCodes": ["CCSS.MATH.6.NS.A.1"]
   }
   ```
4. Trigger ingestion and verify `IngestLog.status === 'SUCCESS'`
5. Test retrieval via a chat session in the relevant subject

### 1.5 Ingestion Failure Diagnosis

Check the `IngestLog` table for the failed run:
```sql
SELECT id, status, "errorMessage", "durationMs", "createdAt"
FROM "IngestLog"
WHERE status = 'FAILURE'
ORDER BY "createdAt" DESC
LIMIT 5;
```

| Error pattern | Root cause | Fix |
|---------------|-----------|-----|
| `PINECONE_API_KEY` auth | Expired or wrong API key | Rotate key in Vercel env vars |
| `OpenAI quota exceeded` | OpenAI rate limit or billing | Check OpenAI dashboard; increase limit |
| `File not found` | Missing content file | Verify file path in request |
| `Chunk count 0` | File too short (< 50 chars) | Add more content or lower `CHUNK_MAX_CHARS` threshold |
| `Embedding dimension mismatch` | Pinecone index dimension ≠ 1536 | Verify index was created with dimension=1536 |

---

## 2. IEP Document Ingestion

### 2.1 Ingestion Flow

IEP documents are ingested by educators with appropriate RBAC (EDUCATOR, SCHOOL_ADMIN, DISTRICT_ADMIN, PLATFORM_ADMIN):

```bash
curl -X POST https://<production-url>/api/iep/ingest \
  -H "Authorization: Bearer <clerk-session-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "clt...",
    "content": "<raw IEP text>",
    "metadata": {
      "gradeLevel": 7,
      "school": "Lincoln Middle School",
      "caseManager": "Jane Smith",
      "lastUpdated": "2026-02-01T00:00:00Z"
    }
  }'
```

### 2.2 Chunk ID Format

```
iep_{studentId}_{documentId}_{sectionType}_{chunkIndex}
e.g. iep_stu_abc123_iep_doc_stu_abc123_1707000000000_xk2z9_accommodations_0
```

### 2.3 Idempotency

IEP ingestion uses **delete-before-upsert**:
1. Existing chunks for `(studentId, documentId)` are deleted from Pinecone
2. New chunks are indexed

Note: `documentId` is generated at each call (timestamp + random suffix), so re-submitting the same raw content creates a new `documentId` and new chunks without deleting the previous version's chunks. To replace an existing IEP version, use `POST /api/iep/ingest` with `existingDocumentId` in the request body to trigger `reingestIepDocument()`.

### 2.4 Stale Chunk Cleanup

If old IEP chunks accumulate (e.g., after many re-ingestions):

```bash
# Identify stale document IDs via audit logs
SELECT metadata->>'documentId' as doc_id, "createdAt"
FROM "AuditLog"
WHERE action = 'IEP_DOCUMENT_INGESTED'
  AND "userId" = '<educator-id>'
ORDER BY "createdAt" ASC;

# Delete old versions from Pinecone via admin script:
# src/lib/rag/iep-vector-store.ts:removeIepDocument(studentId, documentId)
```

### 2.5 FERPA Access Rules

IEP data access is restricted:

| Role | Access |
|------|--------|
| STUDENT | Own IEP only |
| EDUCATOR | Students in their classes |
| SCHOOL_ADMIN / DISTRICT_ADMIN | Students in same tenant |
| PARENT | Own children only |
| PLATFORM_ADMIN | All (for support only) |

Any access outside these rules returns `403 Forbidden`.

---

## 3. Vector Store Operations

### 3.1 Pinecone Index

**Index name:** `PINECONE_INDEX` env var (default: `rootwork-curriculum`)
**Dimensions:** 1536 (OpenAI `text-embedding-3-small`)
**Namespaces:**
- Default namespace: curriculum content (shared across all tenants)
- `iep-documents`: IEP chunks (filtered by `studentId` metadata)

### 3.2 Query Patterns

**Curriculum query:**
```typescript
const results = await queryVectors(embedding, {
  topK: 5,
  subject: 'MATH',
  gradeLevel: 7,
});
```

**IEP query:**
```typescript
const results = await queryIepContext(studentId, query, {
  limit: 10,
  minScore: 0.7,
});
```

### 3.3 Index Rebuild Procedure

Required when:
- Embedding model changes (dimension change)
- Bulk corruption detected
- Namespace migration needed

```bash
# 1. Create new Pinecone index (do NOT delete old one yet)
# Use scripts/create-pinecone-index.ts with new index name

# 2. Update PINECONE_INDEX env var to new index name in staging

# 3. Re-ingest all curriculum content
curl -X POST https://<staging-url>/api/ingest \
  -H "Authorization: Bearer ${N8N_WEBHOOK_SECRET}" \
  -d '{"source": "MANUAL"}'

# 4. Re-ingest all IEP documents (requires educator action or admin script)

# 5. Verify retrieval quality with test queries

# 6. Update PINECONE_INDEX in production → deploy → re-ingest

# 7. Delete old index after 7-day validation period
```

### 3.4 Embedding Dimension Mismatch

If embedding calls fail with dimension errors:
1. Check `PINECONE_INDEX` points to the correct index
2. Verify index was created with `dimension: 1536`
3. If index dimension is wrong → full rebuild (see above)

---

## 4. Context Window Manager

### 4.1 Token Budget

```
Total context: model-dependent (Claude claude-sonnet-4-6: 200k tokens)
┌────────────┬──────────┐
│ IEP        │  40%     │
│ Curriculum │  35%     │
│ Session    │  25%     │
└────────────┴──────────┘
```

### 4.2 Tuning Retrieval Quality

If retrieval quality is poor (wrong context injected):

1. **Check IEP section priorities** in `src/lib/rag/context-window-manager.ts:IEP_SECTION_PRIORITY`
2. **Adjust `topK`** for curriculum queries (default: 5) — increase for broader retrieval, decrease for precision
3. **Check hybrid search score weighting**: `(crossEncoderScore * 0.65) + (hybridScore * 0.35)` in `src/lib/hybrid-search.ts`
4. **Verify Supabase RPC** `match_curriculum_hybrid` is deployed if hybrid search is enabled

### 4.3 Fallback Behaviour

If Pinecone is unavailable:
- `vector-search.ts` attempts Supabase hybrid search as fallback
- If both fail, context is empty — chat responds without RAG context
- This degrades response quality but does NOT cause a 500 error

Monitor for `rag_retrieval_errors` metric to detect Pinecone availability issues.

---

## 5. Embedding Model Operations

### 5.1 Current Model

- **Model:** `text-embedding-3-small`
- **Dimensions:** 1536
- **Provider:** OpenAI
- **Location:** `src/lib/embeddings.ts`

### 5.2 Checking Embedding Health

```bash
# Verify OpenAI embeddings are working
curl https://api.openai.com/v1/embeddings \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model": "text-embedding-3-small", "input": "test"}'
```

### 5.3 Model Migration Procedure

**When to migrate:** OpenAI deprecates `text-embedding-3-small` or a significantly better model is available.

```
1. Update model name in src/lib/embeddings.ts
2. Verify new model dimensions — if dimensions change, Pinecone index must be rebuilt
3. If dimensions unchanged: re-ingest all content to update embeddings
4. If dimensions changed: full index rebuild (see Section 3.3)
5. Run retrieval quality tests before promoting to production
6. Update SPEC_LOCK.md with new model name
```

---

## 6. Monitoring and Alerting

### 6.1 RAG-Specific Metrics

Monitor these in Datadog or via `/api/metrics`:

| Metric | Description | Alert threshold |
|--------|-------------|----------------|
| `rag_retrieval_latency_p95` | 95th percentile retrieval time | > 500ms |
| `rag_retrieval_errors` | Pinecone/embedding failures | > 0 per minute |
| `iep_ingest_success_rate` | IEP ingest success % | < 95% |
| `curriculum_ingest_duration` | End-to-end ingest time | > 5 min |

### 6.2 Audit Log Verification

```sql
-- Verify IEP ingestion audit trail
SELECT "userId", "action", "resourceId", "metadata", "createdAt"
FROM "AuditLog"
WHERE action = 'IEP_DOCUMENT_INGESTED'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check ingest log for recent curriculum runs
SELECT id, status, "contentHash", "processedFiles", "durationMs", "createdAt"
FROM "IngestLog"
ORDER BY "createdAt" DESC
LIMIT 10;
```

### 6.3 Citation Integrity Check

After any curriculum re-ingest, verify citations are intact:

1. Start a chat session in the affected subject
2. Ask a question that should retrieve curriculum content
3. Verify the response references correct material
4. Check Pinecone vector count matches expected chunk count

---

## 7. Disaster Recovery

### 7.1 Pinecone Data Loss

If curriculum Pinecone namespace is corrupted or accidentally deleted:

1. Immediately disable curriculum ingestion via `PlatformConfig.ingestionEnabled = false`
2. Re-ingest all curriculum from scratch:
   ```bash
   curl -X POST https://<production-url>/api/ingest \
     -H "Authorization: Bearer ${N8N_WEBHOOK_SECRET}" \
     -d '{"source": "MANUAL"}'
   ```
3. Re-enable ingestion after verification
4. Chat will operate without curriculum context during rebuild (degraded but functional)

### 7.2 IEP Data Loss (Pinecone iep-documents namespace)

If IEP namespace is lost:
1. Students will receive responses without IEP accommodation context — education staff must be notified
2. Educators must re-submit IEP documents via `POST /api/iep/ingest` for each affected student
3. Use `AuditLog` (`action = 'IEP_DOCUMENT_INGESTED'`) to identify which students had IEPs indexed
4. Track re-ingestion progress via `IngestLog`

### 7.3 OpenAI API Outage

If OpenAI embeddings are unavailable:
1. Ingestion will fail — acceptable for curriculum (daily batch)
2. IEP ingestion for new documents will fail — notify educators
3. Chat RAG retrieval falls back to Supabase hybrid search (no new embeddings needed)
4. Monitor OpenAI status at status.openai.com
5. Retry ingestion after service restores
