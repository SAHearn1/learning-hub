# RAG Operations — Retrieval-Augmented Generation Determinism Guide

**Version:** 1.0.0
**Last updated:** 2026-02-28
**Owner:** Architect Agent + Operations Agent
**Related:** `docs/SPEC_LOCK.md § 4`, `docs/ENTERPRISE_COMPLIANCE_PACKET/data-flows.md`

---

## Overview

Learning Hub uses Retrieval-Augmented Generation (RAG) to ground AI tutoring
responses in authoritative curriculum content. This document defines the
operational standards required to keep RAG behaviour **deterministic, auditable,
tenant-safe, and rebuildable**.

Violating these standards can cause:
- Cross-tenant data leakage (critical)
- Hallucinated citations in student-facing responses
- Non-reproducible ingestion (compliance risk)
- Stale or corrupted vector indices

---

## 1. Architecture

```
Curriculum Documents (PDFs, Markdown)
          │
          ▼
    [Ingest Pipeline]
    src/lib/rag/
    scripts/extract-curriculum.js
          │
          ├─── Chunking (deterministic IDs — see § 2)
          ├─── Embedding (OpenAI text-embedding-3-small v1536)
          ├─── Tenant namespace assignment
          └─── Upsert to Pinecone
                    │
                    ▼
            [Pinecone Vector Index]
            Index: rootwork-curriculum
            Namespaces:
              shared:curriculum   (public curriculum content)
              tenant:<tenantId>   (tenant-specific documents, IEPs)
                    │
                    ▼
          [Retrieval at inference time]
          src/lib/pinecone.ts
          src/lib/hybrid-search.ts
          src/lib/vector-search.ts
                    │
                    ▼
          [Context injection into Claude prompt]
          src/app/api/chat/route.ts
```

---

## 2. Chunk ID Determinism

Every vector upserted to Pinecone **MUST** use a deterministic, content-addressable
chunk ID. This ensures idempotent ingestion: re-ingesting the same document
produces the same vector IDs and overwrites (not duplicates) existing vectors.

### 2.1 Chunk ID Format

```
<namespace>:<document_slug>:<chunk_index>:<content_hash_8>
```

| Component | Derivation |
|---|---|
| `namespace` | `shared:curriculum` or `tenant:<tenantId>` |
| `document_slug` | Filename without extension, lowercased, hyphens for spaces |
| `chunk_index` | Zero-based index of chunk within document |
| `content_hash_8` | First 8 chars of SHA-256 of chunk text |

**Example:**
```
shared:curriculum:grade-3-5-regulate:0:a3f2b9c1
```

### 2.2 Implementation Reference

```typescript
// src/lib/rag/chunk-id.ts (canonical implementation)
import { createHash } from 'crypto';

export function buildChunkId(
  namespace: string,
  documentSlug: string,
  chunkIndex: number,
  chunkText: string,
): string {
  const hash = createHash('sha256').update(chunkText).digest('hex').slice(0, 8);
  return `${namespace}:${documentSlug}:${chunkIndex}:${hash}`;
}
```

### 2.3 Invariants

- Chunk IDs **MUST** be computed before upsert and stored in the `IngestLog` record.
- If a chunk ID changes across ingestion runs (e.g. chunking strategy changed),
  the old vector **MUST** be deleted and the new one upserted — not silently appended.
- Chunk IDs **MUST NOT** contain PII or raw student data.

---

## 3. Embedding Model Version Pinning

| Parameter | Current value |
|---|---|
| Provider | OpenAI |
| Model | `text-embedding-3-small` |
| Dimensions | 1536 |
| Max input characters | 8192 (enforced in `src/lib/embeddings.ts`) |

**Invariants:**
- The embedding model is pinned in `src/lib/embeddings.ts` (`EMBEDDING_MODEL` const).
- The model version **MUST NOT** be changed without:
  1. Re-ingesting all existing documents with the new model.
  2. Updating this document and `SPEC_LOCK.md`.
  3. Bumping the `RAG_SCHEMA_VERSION` env var (triggers cache invalidation).
- Pinecone index dimensions **MUST** match the model output dimensions (1536).
  If dimensions change, a new Pinecone index **MUST** be created (index is not
  dimension-mutable).

---

## 4. Tenant Namespace Isolation

### 4.1 Namespace Assignment

| Document type | Pinecone namespace |
|---|---|
| Shared curriculum (public) | `shared:curriculum` |
| Tenant-uploaded documents | `tenant:<tenantId>` |
| IEP / accommodation data | `tenant:<tenantId>:iep` |

Retrieval queries **MUST** specify the namespace explicitly. Cross-namespace queries
are **prohibited** unless the query is from a `PLATFORM_ADMIN` auditing workflow.

### 4.2 Retrieval Scoping

```typescript
// CORRECT — scoped retrieval
const results = await index
  .namespace(`tenant:${tenantId}`)
  .query({ vector, topK: 5 });

// PROHIBITED — unscoped retrieval (returns all tenants)
const results = await index.query({ vector, topK: 5 });
```

The Verifier Agent checks for unscoped Pinecone queries in every PR.

---

## 5. Ingestion Pipeline

### 5.1 Ingestion Flow

```
1. Upload document → POST /api/ingest (bearer token auth)
2. N8N workflow receives webhook → triggers document extraction
3. extract-curriculum.js chunks document (sliding window, 512 tokens, 64 overlap)
4. For each chunk:
   a. Generate deterministic chunk ID
   b. Generate embedding (OpenAI)
   c. Upsert to Pinecone with metadata
   d. Write IngestLog record (chunk_id, document_slug, embedding_model, checksum)
5. POST /api/admin/trigger-ingest notifies application layer
```

### 5.2 Ingestion Checksum Validation

Each document ingestion **MUST** compute and store a SHA-256 checksum of the
source document bytes. On subsequent ingest runs, if the checksum matches, the
ingest is skipped (idempotent).

```typescript
// IngestLog record (prisma/schema.prisma)
// documentChecksum: String   — SHA-256 hex of raw document bytes
// embeddingModel:   String   — e.g. "text-embedding-3-small"
// chunkCount:       Int      — total chunks produced
// ingestedAt:       DateTime
// tenantId:         String   — nullable for shared curriculum
```

### 5.3 Ingest Audit

Every ingestion run writes to `IngestLog`. The admin UI (`/api/admin/ingest-logs`)
exposes this for compliance review. Retention: 7 years (FERPA).

---

## 6. Index Rebuild Procedure

Use this procedure when:
- The embedding model version changes
- Chunking strategy changes
- A tenant requests data deletion (GDPR/FERPA right to erasure)
- Index corruption is detected

```bash
# Step 1: Create a new Pinecone index (if dimensions changed)
npx ts-node scripts/create-pinecone-index.ts --name rootwork-curriculum-v2

# Step 2: Re-ingest all documents
# (set RAG_REBUILD=true to bypass checksum cache)
RAG_REBUILD=true node scripts/extract-curriculum.js

# Step 3: Validate index health
npx ts-node scripts/smoke-test.ts  # includes /api/health check

# Step 4: Update PINECONE_INDEX_NAME env var to new index

# Step 5: Delete old index after 48-hour canary period
# npx ts-node scripts/create-pinecone-index.ts --delete --name rootwork-curriculum-v1
```

---

## 7. Citation Integrity

All RAG-retrieved context chunks included in a Claude prompt **MUST**:

1. Include the chunk's `document_slug` and `chunk_index` in the prompt metadata.
2. Be stored in the `Session.ragContext` field (JSON) for audit purposes.
3. Be retrievable via the `/api/sessions/[sessionId]` endpoint for FERPA requests.

The post-generation hallucination detector (`src/lib/ai/guardrails/hallucination-detector.ts`)
verifies that factual claims in the model response are grounded in the retrieved
chunks. Ungrounded claims trigger HITL review (`AiSuggestionReview`).

---

## 8. Cache Invalidation

RAG context is cached in Redis under the key:
```
rag:<subject>:<gradeLevel>:<queryHash>
TTL: 3600s (1 hour)
```

Cache **MUST** be invalidated when:
- A new document is ingested for the same subject/grade namespace
- The `RAG_SCHEMA_VERSION` env var changes (triggers full cache flush)
- An admin explicitly calls `POST /api/admin/trigger-ingest` (invalidates subject cache)

---

## 9. Operational Runbook

### 9.1 Symptoms → Actions

| Symptom | Likely cause | Action |
|---|---|---|
| AI responses contain outdated curriculum | Stale cache or stale index | Clear Redis RAG cache; trigger re-ingest |
| AI hallucination spike | Retrieval returning low-relevance chunks | Check Pinecone query scores; lower `topK` or raise score threshold |
| Cross-tenant data in response | Unscoped namespace query | Emergency: block AI endpoints; audit Pinecone queries; open P0 incident |
| Ingest pipeline timeout | Document too large / N8N timeout | Split document; increase N8N timeout; re-run |
| Embedding quota exceeded | OpenAI rate limit | Implement exponential backoff; check batch size |

### 9.2 Health Checks

| Check | Frequency | Alert threshold |
|---|---|---|
| Pinecone index reachable | Every 5 minutes | > 3 consecutive failures → P1 alert |
| Latest ingest timestamp | Daily | > 7 days since last ingest → P2 alert |
| Embedding API latency | Per request | p95 > 2s → P2 alert |

---

## 10. Compliance Notes

- Student chat sessions referencing RAG context are subject to FERPA access requests.
- Tenant-uploaded documents (IEPs) are subject to IDEA privacy requirements.
- Document deletion requests (GDPR/FERPA right to erasure) must:
  1. Delete vectors from Pinecone namespace `tenant:<tenantId>:iep`.
  2. Soft-delete the `IngestLog` record.
  3. Log deletion in the `AuditLog` with the requestor's userId.
- Re-ingestion after deletion **MUST NOT** re-ingest deleted documents.

---

## Changelog

| Date | Version | Change |
|---|---|---|
| 2026-02-28 | 1.0.0 | Initial creation |
