# Agent Debug Runbook — learning-hub

Extends the [RWFW ecosystem runbook](https://github.com/SAHearn1/rwfw-agent-governance/blob/main/docs/AGENT_DEBUG_RUNBOOK.md).

## Stack-Specific Debugging

### Clerk Auth Issues
- Check `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Verify `middleware.ts` routes are correctly configured
- Check Clerk webhook secret (`WEBHOOK_SECRET` / svix)

### Prisma / Database Issues
- `P2002`: unique constraint — check for duplicate insert
- `P1001`: database unreachable — check `DATABASE_URL`
- Schema out of sync: run `npm run db:generate` then `npm run db:migrate`
- Use `npm run db:studio` to inspect data state

### Redis Issues
- Check `REDIS_URL` env var
- ioredis connection errors — verify Redis service is running
- Cache invalidation issues — check key patterns in service layer

### Stripe / Payment Issues
- Webhook errors: check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Payment intent failures: check Stripe key environment (test vs live)
- Use Stripe CLI for local webhook testing

### Anthropic / OpenAI Issues
- Rate limits (429): check quota and implement backoff
- Context window exceeded: check token counting in request
- Pinecone: verify index name, dimension, and namespace

### Build / Deploy Issues
- TypeScript errors: `npm run typecheck` first
- Prisma not generated: `npm run db:generate` then rebuild
- Vercel build: check `vercel-build` script in package.json

---

*Part of: SAHearn1/rwfw-agent-governance ecosystem*
