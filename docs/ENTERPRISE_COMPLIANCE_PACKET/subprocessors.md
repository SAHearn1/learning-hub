# Sub-Processors

**Version:** 1.0.0
**Last updated:** 2026-02-28
**Owner:** Operations Agent

---

## Overview

Learning Hub relies on the following third-party sub-processors. Each sub-processor
has been assessed for FERPA, COPPA, and general security compliance. Districts are
notified of material sub-processor changes at least 30 days in advance.

---

## Sub-Processor List

### 1. Anthropic — AI Model Inference

| Attribute | Value |
|---|---|
| Service | Claude API (claude-sonnet-4-x family) |
| Purpose | AI tutoring response generation |
| Data processed | Student chat messages, anonymised session context |
| Data residency | United States |
| Student PII transmitted | No — guardrails strip PII before prompt assembly |
| Retention (Anthropic) | Zero data retention on API tier (zero-retention API) |
| DPA available | Yes — contact legal@rwfw.org |
| Certification | SOC 2 Type II |

**Important:** All student messages are pre-processed by content-safety guardrails
(`src/lib/ai/guardrails/`) before transmission to Anthropic. PII (names, IDs) is
redacted. Raw student identifiers are never included in Claude prompts.

### 2. OpenAI — Embeddings

| Attribute | Value |
|---|---|
| Service | text-embedding-3-small API |
| Purpose | Curriculum content vectorisation for RAG retrieval |
| Data processed | Curriculum document chunks (no student PII) |
| Data residency | United States |
| Student PII transmitted | No — only curriculum text is embedded |
| Retention (OpenAI) | 30-day API data retention (can be disabled via zero-retention agreement) |
| DPA available | Yes |

### 3. Clerk — Authentication and Identity

| Attribute | Value |
|---|---|
| Service | Clerk.com authentication platform |
| Purpose | User authentication, session management, webhook delivery |
| Data processed | Email addresses, names, role metadata |
| Data residency | United States |
| Student PII transmitted | Yes — email and name for account creation |
| Retention (Clerk) | Per agreement; deletable via Clerk API |
| DPA available | Yes |
| Certification | SOC 2 Type II |

### 4. Stripe — Payments

| Attribute | Value |
|---|---|
| Service | Stripe Payments |
| Purpose | Subscription billing for district/school accounts |
| Data processed | Payment card data (PCI-scoped), billing email, district name |
| Data residency | United States |
| Student PII transmitted | No — billing is at district/school level only |
| Retention (Stripe) | Per PCI-DSS requirements |
| DPA available | Yes |
| Certification | PCI DSS Level 1, SOC 2 Type II |

### 5. Pinecone — Vector Database

| Attribute | Value |
|---|---|
| Service | Pinecone serverless vector index |
| Purpose | Semantic search over curriculum content for RAG |
| Data processed | Curriculum text embeddings; tenant IDs in namespace keys |
| Data residency | United States (AWS us-east-1) |
| Student PII transmitted | No — only curriculum content vectors |
| Retention (Pinecone) | Until explicitly deleted |
| DPA available | Yes |
| Certification | SOC 2 Type II |

### 6. Vercel — Hosting and Edge Network

| Attribute | Value |
|---|---|
| Service | Vercel serverless hosting, Edge Network, Preview Deployments |
| Purpose | Application hosting, CDN, edge middleware |
| Data processed | HTTP request logs, IP addresses (edge), application code |
| Data residency | United States (primary), global CDN |
| Student PII transmitted | Minimal — HTTP logs contain IP addresses only |
| Log retention (Vercel) | 7 days (configurable) |
| DPA available | Yes |
| Certification | SOC 2 Type II, ISO 27001 |

### 7. Neon — PostgreSQL Database

| Attribute | Value |
|---|---|
| Service | Neon serverless Postgres |
| Purpose | Primary application database |
| Data processed | All application data including student records |
| Data residency | United States (AWS us-east-1) |
| Student PII transmitted | Yes — core student data stored here |
| Backup retention | 30 days point-in-time recovery |
| DPA available | Yes |
| Encryption | At rest (AES-256), in transit (TLS 1.3) |

### 8. Upstash Redis — Caching and Rate Limiting

| Attribute | Value |
|---|---|
| Service | Upstash Redis |
| Purpose | Session caching, rate limiting, RAG response caching |
| Data processed | Session metadata, anonymised cache keys |
| Data residency | United States |
| Student PII transmitted | Minimal — cache keys may contain session IDs |
| TTL | Maximum 3600 seconds; no persistent student data |
| DPA available | Yes |

### 9. Sentry — Error Monitoring

| Attribute | Value |
|---|---|
| Service | Sentry.io application monitoring |
| Purpose | Error tracking, performance monitoring |
| Data processed | Stack traces, request URLs, anonymised user context |
| Data residency | United States |
| Student PII transmitted | Minimal — Sentry is configured to scrub PII from error reports |
| DPA available | Yes |
| Certification | SOC 2 Type II |

### 10. N8N — Workflow Automation

| Attribute | Value |
|---|---|
| Service | N8N self-hosted or cloud workflow engine |
| Purpose | Document ingestion pipeline, curriculum processing |
| Data processed | Curriculum documents (no student PII) |
| Data residency | Per deployment configuration |
| Student PII transmitted | No |

---

## Sub-Processor Change Process

1. Operations team identifies new or changed sub-processor.
2. Security review conducted (DPA, certifications, data residency).
3. Districts notified via email at least **30 days** before activation.
4. This document updated.
5. DPA addendum issued if required.

---

## Changelog

| Date | Change |
|---|---|
| 2026-02-28 | Initial creation |
