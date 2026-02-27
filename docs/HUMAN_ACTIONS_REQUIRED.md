# Human Actions Required

These items require manual action by Dr. Hearn or infrastructure admin. They cannot be automated.

## Priority 1 — Before Production Deploy

### 1. Database Migration
Run Prisma migrations against the production database to create the new LMS tables (Term, Course, Assignment, Submission, Grade, FiveRTemplate).

```bash
npx prisma migrate deploy
```

### 2. Credential Rotation
If any credentials were previously committed to git history, rotate them:
- [ ] Clerk API keys (publishable + secret)
- [ ] Anthropic API key
- [ ] Stripe API keys
- [ ] Database connection string
- [ ] Any webhook signing secrets

### 3. Git History Rewrite (Optional)
If secrets were found in git history, execute the filter-repo commands documented in `docs/SECURITY_INCIDENTS.md`:

```bash
pip install git-filter-repo
git filter-repo --path-glob '*.env*' --invert-paths
git push --force-with-lease
```

**Warning:** Force-push rewrites history for all collaborators. Coordinate before executing.

## Priority 2 — Environment Configuration

### 4. Vercel Environment Variables
Ensure these are set in Vercel project settings for production:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 5. Clerk Webhook Configuration
In Clerk Dashboard, configure the webhook endpoint:
- URL: `https://your-domain.com/api/webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`

### 6. Stripe Webhook Configuration
In Stripe Dashboard, configure:
- URL: `https://your-domain.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
- Full step-by-step: `docs/ops/ISSUES_174_176_178_179_192.md`

## Priority 3 — Brand Assets

### 7. Favicon Optimization
The current `/public/brand/favicon.png` is a full-size copy of the RWFW seal. For optimal performance:
- Resize to 32x32px for `favicon.ico`
- Create 180x180px version for Apple touch icon
- Consider generating from seal using an image editor

### 8. Open Graph Image
Create a 1200x630px Open Graph image for social sharing using brand assets. Place at `/public/og-image.png`.

## Priority 4 — CI/CD

### 9. Clerk E2E Test Credentials
Add Clerk test instance credentials to GitHub Actions secrets:
- `CLERK_PUBLISHABLE_KEY_TEST`
- `CLERK_SECRET_KEY_TEST`
- `E2E_CLERK_PUBLISHABLE_KEY_TEST` (optional E2E-specific override)
- `E2E_CLERK_SECRET_KEY_TEST` (optional E2E-specific override)
- `CLERK_TESTING_TOKEN`
- `E2E_CLERK_USER_*` variables
- Full checklist: `docs/ops/ISSUES_174_176_178_179_192.md`

### 10. Custom Domain
Configure custom domain in Vercel:
- Primary: `learn.rootworkframework.com` (or preferred subdomain)
- Update `NEXT_PUBLIC_APP_URL` env var

## Checklist

- [ ] Database migration deployed
- [ ] Credentials rotated (if needed)
- [ ] Vercel env vars configured
- [ ] Clerk webhook configured
- [ ] Stripe webhook configured
- [ ] Favicon optimized
- [ ] Custom domain configured
- [ ] E2E test credentials in CI
