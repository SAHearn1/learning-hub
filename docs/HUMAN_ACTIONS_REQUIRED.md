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
Add Clerk test instance credentials to GitHub Actions secrets (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `E2E_CLERK_PUBLISHABLE_KEY_TEST` | Clerk test-mode publishable key (dedicated E2E instance) |
| `E2E_CLERK_SECRET_KEY_TEST` | Clerk test-mode secret key (dedicated E2E instance) |
| `CLERK_TESTING_TOKEN` | Bypasses Clerk CAPTCHA/bot-detection during E2E sign-in |
| `E2E_CLERK_USER_STUDENT_EMAIL` | Test student email address |
| `E2E_CLERK_USER_STUDENT_PASSWORD` | Test student password |
| `E2E_CLERK_USER_EDUCATOR_EMAIL` | Test educator email address |
| `E2E_CLERK_USER_EDUCATOR_PASSWORD` | Test educator password |
| `E2E_CLERK_USER_PARENT_EMAIL` | Test parent email address |
| `E2E_CLERK_USER_PARENT_PASSWORD` | Test parent password |
| `E2E_CLERK_USER_ADMIN_EMAIL` | Test admin email address |
| `E2E_CLERK_USER_ADMIN_PASSWORD` | Test admin password |

See `docs/ops/ISSUES_174_176_178_179_192.md` (issue #192 section) for full provisioning instructions.

### 10. Custom Domain
Configure custom domain in Vercel:
- Primary: `learn.rootworkframework.com` (or preferred subdomain)
- Update `NEXT_PUBLIC_APP_URL` env var

## Checklist

- [ ] Database migration deployed
- [ ] Credentials rotated (if needed)
- [ ] Vercel env vars configured
- [ ] Clerk webhook configured
- [x] Stripe webhook configured
- [ ] Favicon optimized
- [ ] Custom domain configured
- [ ] E2E test credentials in CI
