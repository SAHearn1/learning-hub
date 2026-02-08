# Operability & DevOps Runbook

## API hardening
- Global API middleware applies per-IP + route rate limiting (`API_RATE_LIMIT_PER_MINUTE`, default 120).
- Structured request logging is emitted for every `/api/*` request.

## Metrics dashboard integration
- `/api/metrics` exposes Prometheus-style metrics.
- `/api/metrics?format=json` exposes JSON for dashboard ingestion.
- Trackers currently include:
  - `api_request_total`
  - `api_rate_limit_block_total`
  - `api_chat_requests_total`
  - `rag_retrieval_total`
  - `rag_retrieval_error_total`
  - route latency summary (avg/p95)

## CI/CD and deployment
- CI now runs unit, integration, build, migration, and compliance checks.
- E2E workflow runs Playwright tests and publishes artifacts.
- Dockerized deployment remains available via `Dockerfile` and `docker-compose.yml`.

## Compliance workflows (COPPA/FERPA)
- Compliance presence checks validate that policy and workflow pages exist:
  - Privacy Policy
  - Terms of Use
  - Data Retention policy
  - Educator compliance dashboard
- `npm run compliance:check` ensures artifacts exist and warns on missing required env vars.
