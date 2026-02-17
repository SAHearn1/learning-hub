# Security Incidents Log

## Incident History

### INC-001: Initial Repository Audit (2026-02-16)

**Severity:** Informational
**Status:** Resolved
**Auditor:** Orchestrator (Claude Opus 4.6)

**Findings:**
- No secrets found in git tree (current HEAD)
- `.env.example` contains only placeholder values
- All source files use `process.env.*` for secret access
- CI workflows use `${{ secrets.* }}` with placeholder fallbacks
- `.gitignore` properly excludes `.env*`, `*.pem`, `credentials/`

**Files Scanned (patterns):**
- `sk-ant-api*`, `sk_live_*`, `pk_live_*` (Anthropic, Stripe keys)
- `NEXT_PUBLIC_*` with non-placeholder values
- `DATABASE_URL` with real connection strings
- `*.pem`, `*.key`, `*.cert` (certificates)
- `GITHUB_TOKEN`, `SLACK_TOKEN`, `AWS_*` (service tokens)

**Result:** Clean. No remediation required.

**Preventive Controls Added:**
- Gitleaks GitHub Action in CI pipeline
- CI guard blocking tracked `.env*` files
- `SECURITY.md` with reporting policy and secret handling rules

---

## Credential Rotation Checklist

If credentials are ever exposed, rotate them using these steps:

### Clerk
1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → API Keys
2. Rotate the Publishable Key and Secret Key
3. Update in Vercel environment variables (Production + Preview)
4. Update in GitHub Actions secrets: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### Anthropic
1. Go to [Anthropic Console](https://console.anthropic.com) → API Keys
2. Delete the compromised key and create a new one
3. Update in Vercel: `ANTHROPIC_API_KEY`
4. Update in GitHub Actions secrets

### Stripe
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API Keys
2. Roll the secret key (Stripe supports rolling without downtime)
3. Update in Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
4. Update webhook endpoint signing secret if applicable

### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com) → API Keys
2. Delete and recreate the key
3. Update in Vercel: `OPENAI_API_KEY`

### Pinecone
1. Go to [Pinecone Console](https://app.pinecone.io) → API Keys
2. Rotate the key
3. Update in Vercel: `PINECONE_API_KEY`

### Database (Prisma/PostgreSQL)
1. Update password via database provider dashboard
2. Update both `DATABASE_URL` and `DIRECT_URL` in Vercel
3. Verify connectivity: `npx prisma db pull`

### General Steps (All Credentials)
1. Rotate the credential at the provider
2. Update in Vercel (Production + Preview + Development)
3. Update in GitHub Actions secrets
4. Verify: `npm run build` succeeds
5. Document the rotation in this file
6. If credential was in git history, run history purge (see below)

---

## Git History Purge Procedure

If secrets are found in git history:

```bash
# 1. Install git-filter-repo
pip install git-filter-repo

# 2. Identify files to purge
git log --all --full-history -- <path-to-secret-file>

# 3. Remove from history
git filter-repo --invert-paths --path <path-to-secret-file>

# 4. Force push (DESTRUCTIVE — coordinate with team)
git push --force --all
git push --force --tags

# 5. All team members must re-clone
# 6. Rotate all credentials that were in the purged file
# 7. Document in this file
```

**Warning:** Force push rewrites history. All team members must re-clone after this operation.
