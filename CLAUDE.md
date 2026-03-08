# CLAUDE.md — learning-hub

> Agent briefing document. Read this before touching any code.
> Governance hub: `SAHearn1/rwfw-agent-governance`

## Repo Identity

- **Purpose:** Learning hub platform — AI-powered tutoring with payments and RAG
- **Tier:** 1 (production-critical)
- **Criticality:** HIGH — handles payments and user learning data

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Auth | Clerk |
| Database | PostgreSQL + Prisma ORM |
| AI | Anthropic Claude SDK |
| RAG | Pinecone vector database |
| Payments | Stripe |
| Deployment | Vercel |

## Before You Write Any Code

1. Read `repo.intelligence.yml` — authoritative stack profile
2. Read `docs/ARCHITECTURE_MAP.md`
3. Read `docs/RUNTIME_MAP.md` — especially Stripe webhook setup
4. Check `docs/INCIDENTS.md`

## Critical Rules for This Repo

- **Stripe webhooks must be verified.** Always validate `stripe.webhooks.constructEvent()`. Never process unverified webhook payloads.
- **Prisma migrations must be reviewed before running in production.** Never run `prisma migrate deploy` without checking the migration diff.
- **Pinecone index names are environment-specific.** Dev and prod must use separate indexes. Never cross-contaminate.
- **Anthropic API costs money per token.** Never stream responses to a dead client. Always handle abort signals.
- **Clerk auth gates all API routes.** Use `auth()` from `@clerk/nextjs/server` in every route handler that touches user data.
- **No `git add .`** — stage specific files only.

## Dev Workflow

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
npm run lint
npm run type-check
npm run build
```

## Required Env Vars

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
DATABASE_URL
ANTHROPIC_API_KEY
PINECONE_API_KEY
PINECONE_INDEX
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

## Debugging

See `docs/AGENT_DEBUG_RUNBOOK.md` for the 6-phase debug protocol.  
See `docs/DEBUG_PLAYBOOK.md` for Clerk/Prisma/Stripe/Pinecone failure tables.

## Governance

All agents operating here must follow `AGENTS.md` (8 rules).

## Operating Rules

**If you resolve a bug during this session, you MUST append an entry to `docs/INCIDENTS.md` before the session ends. This is non-negotiable. Session is not complete until the entry is committed.**

See Rule 7 in `AGENTS.md` (governance hub: `SAHearn1/rwfw-agent-governance`) for the full incident logging protocol.
