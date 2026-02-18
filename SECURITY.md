# Security Policy — RootWork Learning Hub

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Email:** security@rootworkframework.com
2. **Do NOT** open a public GitHub issue for security vulnerabilities.
3. Include a description of the vulnerability, steps to reproduce, and potential impact.
4. You will receive acknowledgment within 48 hours and a resolution timeline within 5 business days.

## Scope

This policy covers:
- The RootWork Learning Hub application (`SAHearn1/learning-hub`)
- All API endpoints under `/api/*`
- Authentication and authorization flows
- Student data handling and privacy controls

## Secret Handling Policy

### Prohibited in Repository
- **Environment files:** `.env`, `.env.local`, `.env.production`, `.env.staging` (only `.env.example` with placeholders allowed)
- **API keys:** Clerk, Anthropic, OpenAI, Stripe, Pinecone, or any third-party service keys
- **Certificates:** TLS/SSL certificates, PEM files, private keys
- **Credentials:** Database connection strings with real passwords, OAuth client secrets
- **Tokens:** JWTs, session tokens, webhook secrets with real values

### Enforcement
- `.gitignore` blocks all `.env*` files (except `.env.example`)
- CI pipeline includes secret scanning via [gitleaks](https://github.com/gitleaks/gitleaks)
- CI guard fails if any `.env*` file (except `.env.example`) is tracked in git
- Pre-commit hooks recommended for local development

### If Secrets Are Accidentally Committed
1. **Immediately** rotate the exposed credentials
2. Remove the file from the git tree
3. If in history, follow the purge procedure in `docs/SECURITY_INCIDENTS.md`
4. Document the incident in `docs/SECURITY_INCIDENTS.md`

## Data Classification (K-12 Context)

| Classification | Examples | Handling |
|---------------|----------|----------|
| **Restricted** | Student PII, IEP data, health records, parent contact info | Encrypted at rest, tenant-isolated, audit-logged, consent-gated |
| **Confidential** | Assessment scores, learning progress, behavioral data | Tenant-isolated, role-gated, audit-logged |
| **Internal** | Curriculum content, system configuration, usage metrics | Access-controlled, no PII in logs |
| **Public** | Marketing content, published documentation | No restrictions |

## Compliance Posture

- **FERPA:** Student education records protected via RBAC + tenant isolation + audit logging
- **COPPA:** Minor consent workflow enforced before data collection; parental consent required
- **IDEA:** IEP accommodations stored securely with role-based access (Educator, School Admin only)

## Security Headers

The application enforces:
- `Strict-Transport-Security` (HSTS, 1 year, includeSubDomains, preload)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` (script-src, connect-src, frame-src restricted)
- CSRF protection on all mutating API endpoints (POST, PUT, PATCH, DELETE)
- Rate limiting: 120 requests / 60 seconds per IP

## Supported Versions

| Version | Supported |
|---------|-----------|
| main branch | Yes |
| Feature branches | Best-effort |
