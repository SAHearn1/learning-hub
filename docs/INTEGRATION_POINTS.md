# Integration Points — learning-hub

## External Services

| Service | Purpose | Auth Method | Failure Impact |
|---------|---------|------------|----------------|
| Clerk | Authentication | Secret key + publishable key | Full auth failure |
| PostgreSQL | Primary data store | DATABASE_URL | Full data failure |
| Redis | Caching | REDIS_URL | Performance degradation |
| Anthropic Claude | AI tutoring | API key | AI features unavailable |
| OpenAI | AI features | API key | AI features unavailable |
| Pinecone | RAG / vector search | API key | RAG features unavailable |
| Stripe | Payments + subscriptions | Secret key + webhook secret | Payments fail |
| Sentry | Error tracking | DSN | Silent failures |
| Datadog | APM | dd-trace | Monitoring unavailable |
| Vercel | Deployment + analytics | Vercel config | Deploy failures |

## Webhooks

| Provider | Handler | Events |
|---------|---------|--------|
| Clerk | app/api/webhooks/clerk (TODO — verify) | User created/updated |
| Stripe | app/api/webhooks/stripe (TODO — verify) | Payment events |

---

*Part of: SAHearn1/rwfw-agent-governance ecosystem*
