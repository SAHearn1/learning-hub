# Debug Playbook — learning-hub

| Symptom | Check First | Common Root Cause |
|---------|-------------|-------------------|
| Clerk auth fails | CLERK_SECRET_KEY env | Missing or wrong key |
| Prisma P2002 | Unique constraint | Duplicate insert / race condition |
| Prisma P1001 | DATABASE_URL | DB unreachable or wrong URL |
| Redis connection refused | REDIS_URL | Redis not running or wrong URL |
| Stripe webhook 400 | STRIPE_WEBHOOK_SECRET | Secret mismatch |
| Anthropic 429 | Rate limits | Quota exceeded — add backoff |
| Pinecone error | Index name + dimension | Wrong index config |
| Playwright test fails | `.env.test` | Test env vars not set |
| Build: Prisma not found | `npm run db:generate` | Client not regenerated |
| Vercel build fails | `npm run typecheck` | TypeScript regression |

---

*See also: [RWFW Debug Playbook](https://github.com/SAHearn1/rwfw-agent-governance/blob/main/docs/DEBUG_PLAYBOOK.md)*
