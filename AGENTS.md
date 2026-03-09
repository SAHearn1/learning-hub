# AGENTS.md — learning-hub
**rootwork-tutor — Production Tutoring LMS**
**Governance Hub:** [SAHearn1/rwfw-agent-governance](https://github.com/SAHearn1/rwfw-agent-governance)

---

## Repo Context

Production tutoring LMS with AI (Anthropic Claude), payments (Stripe), RAG (Pinecone), Clerk auth, Prisma/PostgreSQL, Redis caching, Sentry monitoring, Vercel deployment. Extensive test suite including load tests.

## Operating Rules

All agents must follow the [RWFW AGENTS.md standard](https://github.com/SAHearn1/rwfw-agent-governance/blob/main/AGENTS.md).

1. **Read before acting.** Never modify source you have not read.
2. **Identify the first failing boundary** before any fix.
3. **Smallest viable fix.** Do not refactor adjacent code.
4. **Verify before complete.** Run `npm run lint`, `npm run typecheck`, `npm run test:ci`.
5. **Prisma safety.** Never modify `prisma/schema.prisma` without running `npx prisma migrate dev` in a safe environment.
6. **Governance-only scope.** Write only to `/docs/`, `/.github/`, `/AGENTS.md`, `/repo.intelligence.yml`, root markdown.

## Stack Quick Reference

- Framework: Next.js 15 + React 18
- Auth: Clerk
- Database: PostgreSQL + Prisma
- Cache: Redis (ioredis)
- AI: Anthropic Claude (@anthropic-ai/sdk) + OpenAI
- RAG: Pinecone
- Payments: Stripe
- Monitoring: Sentry + Datadog (dd-trace)
- Analytics: Vercel Analytics
- Testing: Vitest + Playwright + load tests

## Common Commands

```bash
npm run dev           # Start Next.js dev server
npm run build         # Production build
npm run lint          # ESLint
npm run typecheck     # TypeScript check
npm run test:ci       # Vitest CI run
npm run test:e2e      # Playwright E2E
npm run db:studio     # Prisma Studio
npm run db:migrate    # Prisma migrate dev
```

---

*Governed by: [SAHearn1/rwfw-agent-governance](https://github.com/SAHearn1/rwfw-agent-governance)*
