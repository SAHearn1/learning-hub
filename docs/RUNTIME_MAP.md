# Runtime Map — learning-hub

## Entrypoints

| Entrypoint | Type | Description |
|-----------|------|-------------|
| `app/` | Next.js App Router | Main application |
| `prisma/` | Prisma | Database schema and migrations |
| `tests/` | Tests | Vitest unit + Playwright E2E + load tests |

## Environment Variables (key subset)

| Variable | Required | Purpose |
|----------|---------|----------|
| DATABASE_URL | Yes | PostgreSQL connection |
| CLERK_SECRET_KEY | Yes | Clerk server auth |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Yes | Clerk client auth |
| ANTHROPIC_API_KEY | Yes | Claude AI |
| OPENAI_API_KEY | Yes | OpenAI |
| PINECONE_API_KEY | Yes | Pinecone RAG |
| STRIPE_SECRET_KEY | Yes | Stripe payments |
| STRIPE_WEBHOOK_SECRET | Yes | Stripe webhooks |
| REDIS_URL | Yes | Redis cache |

## Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test:ci
npm run test:e2e
npm run db:migrate
npm run db:generate
npm run db:studio
npm run vercel-build
```

---

*Part of: SAHearn1/rwfw-agent-governance ecosystem*
