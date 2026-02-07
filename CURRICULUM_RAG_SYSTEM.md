# Curriculum Management and RAG System

This document describes the curriculum management and RAG-enhanced chat system implemented for the learning hub.

## Overview

The system provides:
1. **Curriculum Storage**: Organized curriculum content in the `docs/` directory
2. **Webhook Ingestion**: API endpoint for receiving curriculum updates from n8n workflows
3. **Admin Interface**: UI for monitoring and managing curriculum ingestion
4. **Vector Database**: Pinecone integration for semantic search
5. **RAG-Enhanced Chat**: Chat API that retrieves relevant curriculum context
6. **Automated Workflows**: GitHub Actions for scheduled curriculum updates

## Architecture

```
┌─────────────┐
│   docs/     │  Curriculum files (markdown)
└──────┬──────┘
       │
       ├──> n8n Workflow ──> Parse & Extract
       │                          │
       │                          ▼
       │                    Generate Embeddings
       │                          │
       │                          ▼
       │                    ┌──────────────┐
       │                    │  Pinecone    │
       │                    │  (Vectors)   │
       │                    └──────┬───────┘
       │                           │
       ▼                           │
┌─────────────────┐                │
│  /api/ingest    │◄───────────────┘
│  (Webhook)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IngestLog DB   │
│  (Audit Trail)  │
└─────────────────┘

User Query ──> /api/chat ──> Generate Embedding ──> Query Pinecone
                   │                                      │
                   │                                      ▼
                   │                              Retrieve Context
                   │                                      │
                   └──────> Build Prompt <───────────────┘
                                 │
                                 ▼
                           Claude API
                                 │
                                 ▼
                           Stream Response
```

## Components

### 1. Curriculum Structure (`docs/`)

Extracted from `fg2g-curriculum.zip`, the curriculum is organized in numbered folders:

```
docs/
├── README.md
├── appendices/
├── docs/
│   ├── 00-front-matter/
│   ├── 01-introduction/
│   ├── 02-theoretical-foundation/
│   ├── 03-5rs-framework/
│   ├── 04-grade-bands/
│   │   ├── K-2/
│   │   ├── 3-5/
│   │   ├── 6-8/
│   │   └── 9-12/
│   ├── 05-living-learning-labs/
│   ├── 06-assessment-tools/
│   ├── 07-professional-development/
│   ├── 08-technology-integration/
│   ├── 09-community-partnerships/
│   └── 10-implementation-guide/
└── assets/
```

### 2. Webhook Ingestion Endpoint (`/api/ingest`)

**Purpose**: Receives curriculum data from n8n workflows and logs ingestion events.

**Authentication**: Bearer token using `N8N_WEBHOOK_SECRET` environment variable.

**Request Format**:
```json
{
  "source": "WEBHOOK",
  "files": [
    {
      "path": "docs/01-introduction/why-this-curriculum.md",
      "content": "...",
      "metadata": {
        "course": "RootWork Framework",
        "module": "Introduction"
      }
    }
  ],
  "metadata": {
    "triggeredBy": "github-actions",
    "timestamp": "2026-02-07T22:00:00.000Z"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Ingestion completed successfully",
  "logId": "clxxx...",
  "processedFiles": 5,
  "durationMs": 1234
}
```

**TODO**: Implement actual file processing logic:
1. Parse curriculum file content
2. Generate embeddings using a production embedding service (OpenAI, Cohere, etc.)
3. Upsert vectors to Pinecone with metadata
4. Update database records as needed

### 3. Admin Ingest UI (`/admin/ingest`)

**Features**:
- View ingestion history with statistics
- Real-time log updates (polls every 5 seconds)
- Filter by status (Success, Failure, Processing, Pending)
- Search logs by ID, source, or error message
- Manual ingestion trigger button
- Statistics dashboard showing total, successful, failed, and processing ingestions

**Access Control**: Only accessible to users with `PLATFORM_ADMIN`, `DISTRICT_ADMIN`, or `SCHOOL_ADMIN` roles.

### 4. IngestLog Database Model

```prisma
model IngestLog {
  id               String       @id @default(cuid())
  timestamp        DateTime     @default(now())
  status           IngestStatus // PENDING, SUCCESS, FAILURE, PROCESSING
  source           IngestSource // WEBHOOK, MANUAL, SCHEDULED, API
  payload          Json?
  errorMessage     String?      @db.Text
  processedFiles   Int          @default(0)
  durationMs       Int?
  metadata         Json?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@index([timestamp])
  @@index([status])
  @@index([source])
}
```

### 5. Pinecone Integration

**Client Library** (`src/lib/pinecone/client.ts`):
- `getPineconeClient()`: Initialize Pinecone client
- `queryPinecone(embedding, topK, filter)`: Search for similar vectors
- `upsertToPinecone(vectors)`: Insert/update vectors

**Embeddings** (`src/lib/pinecone/embeddings.ts`):
- `generateEmbedding(text)`: Generate embedding vector for text
- `generateEmbeddings(texts[])`: Batch generate embeddings

**⚠️ IMPORTANT**: The current implementation uses placeholder embeddings. You MUST integrate a production embedding service before deployment:
- OpenAI: `text-embedding-3-small` or `text-embedding-3-large`
- Cohere: `embed-english-v3.0`
- Voyage AI: `voyage-2`

### 6. RAG-Enhanced Chat API

The chat API (`/api/chat`) has been enhanced with RAG capabilities:

1. **Query Embedding**: User's message is converted to an embedding vector
2. **Context Retrieval**: Query Pinecone for top-k most relevant curriculum documents
3. **Filtering**: Filter by subject and grade level
4. **Context Injection**: Retrieved content is added to the system prompt
5. **Response Generation**: Claude generates response using both conversation history and curriculum context

**Metrics Logged**:
- Number of contexts retrieved
- Retrieval duration (ms)
- Session ID for debugging

### 7. GitHub Actions Workflow

**File**: `.github/workflows/trigger-ingest.yml`

**Triggers**:
- Manual dispatch via GitHub UI
- Scheduled daily at 2 AM UTC
- Can be customized with different sources (SCHEDULED, MANUAL, API)

**Workflow**:
1. Checkout repository
2. Trigger n8n webhook with repository metadata
3. Includes authentication using `N8N_WEBHOOK_SECRET`
4. Reports success/failure status

**Required Secrets**:
- `N8N_WEBHOOK_URL`: URL of the n8n webhook endpoint
- `N8N_WEBHOOK_SECRET`: Secret for authenticating webhook requests

### 8. n8n Workflow Configuration

**File**: `n8n-workflow-curriculum-ingestion.json`

**Nodes**:
1. **Webhook**: Receives trigger from GitHub Actions
2. **GitHub**: Fetches curriculum files from repository
3. **Transform**: Extracts and processes metadata
4. **Pinecone**: Stores embeddings in vector database
5. **HTTP Request**: Notifies learning hub via `/api/ingest`

**Required Credentials**:
- GitHub API credentials
- Pinecone API key
- Learning hub webhook authentication

### 9. Enhanced System Prompt

The master system prompt now includes curriculum-aware instructions:

- Reference specific course materials when relevant
- Cite curriculum sources naturally
- Adapt explanations to match curriculum's pedagogical approach
- Use consistent terminology from curriculum
- Guide students through appropriate learning pathways
- Acknowledge when curriculum context is insufficient

## Environment Variables

Add these to your `.env` file:

```bash
# Pinecone Vector Database
PINECONE_API_KEY=your_api_key_here
PINECONE_ENVIRONMENT=your_environment_here  # e.g., us-west1-gcp
PINECONE_INDEX_NAME=your_index_name_here

# n8n Workflow Integration
N8N_WEBHOOK_SECRET=your_secret_here
N8N_WEBHOOK_URL=your_n8n_webhook_url_here
```

## Setup Instructions

### 1. Pinecone Setup

```bash
# Install Pinecone CLI (optional)
npm install -g @pinecone-database/cli

# Create index
# Dimension should match your embedding model (1536 for OpenAI text-embedding-3-small)
# Use cosine similarity for semantic search
```

Via Pinecone Dashboard:
1. Create new index with dimension 1536 (or your embedding model's dimension)
2. Choose cosine similarity metric
3. Copy API key and environment name

### 2. n8n Workflow Setup

1. Import `n8n-workflow-curriculum-ingestion.json` into n8n
2. Configure credentials:
   - GitHub API token with read access to repository
   - Pinecone API credentials
   - HTTP header auth for webhook callback
3. Set environment variables in n8n:
   - `PINECONE_API_KEY`
   - `PINECONE_ENVIRONMENT`
   - `PINECONE_INDEX_NAME`
   - `NEXT_PUBLIC_APP_URL`
4. Activate workflow
5. Copy webhook URL

### 3. GitHub Secrets Setup

In your GitHub repository settings, add:
- `N8N_WEBHOOK_URL`: The webhook URL from n8n
- `N8N_WEBHOOK_SECRET`: Generate a secure random string

### 4. Database Migration

```bash
# Generate Prisma client with new IngestLog model
npm run db:generate

# Run migration
npm run db:migrate
```

### 5. Embedding Service Integration

Replace the placeholder in `src/lib/pinecone/embeddings.ts`:

**OpenAI Example**:
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}
```

## Usage

### Manual Ingestion Trigger

1. Navigate to `/admin/ingest` in your browser
2. Click "Trigger Manual Ingestion" button
3. Monitor the ingestion logs table for status

### Automated Ingestion

Runs automatically via GitHub Actions:
- Daily at 2 AM UTC
- Can be manually triggered from GitHub Actions tab

### Testing the RAG System

1. Start a new chat session as a student
2. Ask a question related to curriculum content
3. The system will:
   - Generate embedding for your question
   - Search Pinecone for relevant curriculum content
   - Inject retrieved context into the conversation
   - Generate response using Claude with curriculum context

### Monitoring

- **Admin UI**: View ingestion history at `/admin/ingest`
- **Database**: Query `IngestLog` table for detailed audit trail
- **Logs**: Check application logs for RAG retrieval metrics

## Security Considerations

✅ **Implemented**:
- Webhook secret authentication for ingestion endpoint
- Role-based access control for admin endpoints
- Server-side secret handling (no client-side exposure)
- GitHub Actions permission restrictions

⚠️ **Recommendations**:
- Use HTTPS for all webhook communications
- Rotate webhook secrets regularly
- Monitor ingestion logs for suspicious activity
- Implement rate limiting on ingestion endpoint
- Use read-only GitHub tokens with minimal scope

## Performance Considerations

- **RAG Query Time**: ~100-300ms depending on Pinecone latency
- **Embedding Generation**: ~50-200ms per query (varies by service)
- **Cache Strategy**: Consider caching embeddings for common queries
- **Batch Processing**: Use batch embedding generation for efficiency
- **Index Optimization**: Use appropriate Pinecone pod type for your scale

## Troubleshooting

### Ingestion Fails

1. Check `IngestLog` table for error messages
2. Verify webhook secret matches between n8n and application
3. Ensure n8n workflow is active
4. Check GitHub Actions logs for trigger failures

### RAG Returns No Context

1. Verify Pinecone index has data: use Pinecone dashboard
2. Check PINECONE_INDEX_NAME environment variable
3. Verify embeddings are being generated correctly
4. Check filter criteria (subject, grade level)

### Chat API Errors

1. Check application logs for RAG retrieval errors
2. Verify Pinecone API key and environment
3. Test embedding generation separately
4. Confirm Claude API is responding

## Future Enhancements

1. **Implement Actual File Processing**: Add logic to parse curriculum files and generate embeddings
2. **Add Embedding Cache**: Cache frequently queried embeddings
3. **Metadata Filtering**: Add more sophisticated filtering (difficulty, topic, standards)
4. **Hybrid Search**: Combine semantic search with keyword search
5. **Reranking**: Implement reranking of retrieved results for better relevance
6. **Admin Analytics**: Add charts and metrics to admin dashboard
7. **Batch Ingestion**: Support bulk curriculum updates
8. **Version Control**: Track curriculum versions and changes
9. **A/B Testing**: Compare RAG-enhanced vs. non-RAG responses
10. **User Feedback Loop**: Collect feedback on response quality

## License

Part of the RootWork Learning Hub platform.
