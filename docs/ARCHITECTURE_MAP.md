# Architecture Map — learning-hub

> Scaffold from package.json Phase A read. Prisma schema and app/ deep read deferred to Phase C.

## System Overview

rootwork-tutor — Production tutoring LMS for the RWFW ecosystem. Next.js 15 full-stack with Clerk auth, PostgreSQL/Prisma, Redis caching, Anthropic Claude AI, Pinecone RAG, Stripe payments, Vercel deployment.

## Layer Diagram

```
[Student / Educator / Parent / Admin]
              ↓
[Next.js 15 App Router]     app/ directory
  ├─ UI: React 18 + Tailwind + Radix UI
  └─ Routing: Next.js App Router
              ↓
[API Layer]                 app/api/ routes
              ↓
[Auth Layer]                Clerk middleware
  └─ Webhooks: svix (Clerk webhooks)
              ↓
[Service Layer]             TODO — Phase C deep read
  ├─ AI: Anthropic Claude
  ├─ AI: OpenAI
  ├─ RAG: Pinecone
  └─ Payments: Stripe
              ↓
[Data Layer]
  ├─ PostgreSQL + Prisma ORM
  └─ Redis cache (ioredis)
              ↓
[Infrastructure]
  └─ Vercel (deployment + analytics + speed insights)
```

---

*Part of: SAHearn1/rwfw-agent-governance ecosystem*
