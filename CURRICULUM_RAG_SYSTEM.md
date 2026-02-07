# Curriculum RAG System — Architecture & Setup Guide

## Overview

The Curriculum RAG (Retrieval-Augmented Generation) system enriches RootGuide's tutoring
conversations with curriculum-aligned content. When a student asks about fractions, the
system retrieves the relevant Georgia Standards of Excellence, prerequisite concepts,
common misconceptions, and scaffolded problems — then injects that context into the AI
prompt so RootGuide can tutor with precision.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     INGESTION PIPELINE                          │
│                                                                 │
│  Curriculum Files ──► n8n Webhook ──► /api/ingest               │
│  (GitHub repo)        (on push)       │                         │
│                                       ├─► Parse (PDF/MD/JSON)   │
│                                       ├─► Chunk (512 tokens)    │
│                                       ├─► Embed (OpenAI)        │
│                                       ├─► Store (Pinecone)      │
│                                       └─► Log (IngestLog)       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     RETRIEVAL PIPELINE                           │
│                                                                 │
│  Student Message ──► Embed Query ──► Pinecone Search            │
│                                      │                          │
│                                      ├─► Top-K results (k=5)   │
│                                      ├─► Rerank by relevance    │
│                                      └─► Inject into prompt     │
│                                           as topicContext       │
│                                                                 │
│  /api/chat ──► buildMasterSystemPrompt({ topicContext }) ──► AI │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Embedding Service (`src/lib/embeddings.ts`)

- **Model**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Cost**: ~$0.02 per 1M tokens
- **Why OpenAI**: Best cost/quality ratio for educational content, wide ecosystem support
- Generates embeddings for both ingested documents and student queries
- Tracks usage in AIUsageLedger with `EMBEDDING_GENERATION` request type

### 2. Vector Store (`src/lib/pinecone.ts`)

- **Service**: Pinecone (serverless, us-east-1)
- **Index**: `rootwork-curriculum`
- **Dimensions**: 1536 (matching text-embedding-3-small)
- **Metric**: cosine similarity
- **Metadata fields**: subject, gradeLevel, standard, documentType, chunkIndex

### 3. Ingest API (`src/app/api/ingest/route.ts`)

- Receives curriculum files via POST (multipart or JSON)
- Supports: Markdown (.md), JSON (.json), plain text (.txt), PDF (.pdf)
- Chunks documents into ~512-token segments with overlap
- Generates embeddings and upserts to Pinecone
- Logs every ingest operation in `IngestLog` table
- Authenticated via webhook secret (for n8n) or Clerk (for admin UI)

### 4. Vector Search (`src/lib/vector-search.ts`)

- Embeds the student's query
- Queries Pinecone with metadata filters (subject, gradeLevel)
- Returns top-K results with scores
- Formats results as structured context for the system prompt

### 5. n8n Workflow

- **Trigger**: GitHub push to curriculum content repo
- **Action**: Fetches changed files, POSTs each to `/api/ingest`
- **Authentication**: Shared webhook secret (`N8N_WEBHOOK_SECRET`)

## Data Flow

### Ingestion
1. Educator pushes curriculum file to GitHub
2. GitHub webhook triggers n8n workflow
3. n8n fetches file content and metadata
4. n8n POSTs to `/api/ingest` with file content + metadata
5. Ingest route parses, chunks, embeds, and stores in Pinecone
6. IngestLog records the operation for audit

### Retrieval (during tutoring)
1. Student sends a message in `/api/chat`
2. Chat route calls `searchCurriculum(query, { subject, gradeLevel })`
3. Query is embedded via OpenAI
4. Pinecone returns top-5 matching chunks
5. Chunks are formatted and injected as `topicContext` in the system prompt
6. RootGuide responds with curriculum-aligned tutoring

## Database Schema

### IngestLog Model
```prisma
model IngestLog {
  id             String       @id @default(cuid())
  tenantId       String
  filename       String
  documentType   String       // md, json, txt, pdf
  subject        Subject?
  gradeLevel     Int[]
  standardCodes  String[]     // e.g., ["MGSE3.NF.1", "MGSE3.NF.2"]
  chunkCount     Int
  vectorIds      String[]     // Pinecone vector IDs
  status         IngestStatus
  errorMessage   String?
  metadata       Json?
  processedAt    DateTime     @default(now())
  @@index([tenantId])
  @@index([status])
}

enum IngestStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

## Setup Guide

### Prerequisites
- OpenAI API key (for embeddings)
- Pinecone account (free tier works for development)
- n8n instance (cloud or self-hosted)

### Step 1: Environment Variables

Add to `.env`:
```bash
# Embedding Service (OpenAI)
OPENAI_API_KEY=sk-xxxxx

# Vector Store (Pinecone)
PINECONE_API_KEY=pcsk_xxxxx
PINECONE_INDEX=rootwork-curriculum

# Ingest Webhook
N8N_WEBHOOK_SECRET=whsec_xxxxx
```

### Step 2: Create Pinecone Index

```bash
npx tsx scripts/create-pinecone-index.ts
```

This creates a serverless index with:
- 1536 dimensions (text-embedding-3-small)
- Cosine similarity metric
- us-east-1 region (AWS)

### Step 3: Run Database Migration

```bash
npm run db:migrate
```

This creates the `IngestLog` table.

### Step 4: Configure n8n Workflow

1. Import `scripts/n8n-workflow.json` into your n8n instance
2. Set credentials:
   - **GitHub**: OAuth or personal access token for the curriculum repo
   - **HTTP Request**: Set header `x-webhook-secret` to your `N8N_WEBHOOK_SECRET`
   - **URL**: Set to `https://your-domain.com/api/ingest`
3. Activate the workflow

### Step 5: Set GitHub Secrets

In the curriculum content repository (not this app repo):
```
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/curriculum-ingest
N8N_WEBHOOK_SECRET=whsec_xxxxx
```

Configure a GitHub webhook pointing to the n8n webhook URL, triggered on `push` events.

### Step 6: Test the Pipeline

```bash
# Manual ingest test
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{
    "filename": "MGSE3.NF.1.md",
    "content": "# MGSE3.NF.1\n\nUnderstand a fraction 1/b...",
    "documentType": "md",
    "subject": "MATH",
    "gradeLevel": [3],
    "standardCodes": ["MGSE3.NF.1"]
  }'
```

## Chunking Strategy

Documents are split into chunks of ~512 tokens with 50-token overlap:

1. **Markdown**: Split on `## ` headers, then by paragraphs
2. **JSON**: Each top-level object or array element becomes a chunk
3. **Plain text**: Split on double newlines, then by sentence boundaries
4. **PDF**: Extract text, then apply plain text splitting

Each chunk preserves:
- Source filename and document type
- Subject and grade level metadata
- Standard codes (if applicable)
- Position index within the document

## Metadata Schema (Pinecone)

Each vector in Pinecone carries this metadata:
```json
{
  "filename": "MGSE3.NF.1.md",
  "documentType": "md",
  "subject": "MATH",
  "gradeLevel": 3,
  "standardCodes": ["MGSE3.NF.1"],
  "chunkIndex": 0,
  "totalChunks": 4,
  "text": "Understand a fraction 1/b as the quantity..."
}
```

## Cost Estimates

| Component | Free Tier | Production |
|-----------|-----------|------------|
| OpenAI Embeddings | $0.02/1M tokens | ~$1-5/month |
| Pinecone | 100K vectors free | $70/month (s1.x1) |
| n8n | 5 workflows free | $20/month (cloud) |

For a typical K-12 curriculum (~500 standards, ~200 topics), expect:
- ~2,000 vectors in Pinecone
- ~$0.50 in embedding costs (one-time)
- Per-query cost: ~$0.00002 (negligible)
