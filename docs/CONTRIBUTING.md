# Contributing to RootWork Learning Hub

Thank you for contributing to the RootWork Learning Hub, an AI-powered tutoring platform for K-12 special education operated by Community Exceptional Children's Services (CECS). This guide covers our development workflow, conventions, and quality standards.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/SAHearn1/learning-hub.git
cd learning-hub

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start the development server
npm run dev
```

You will need the following environment variables configured in `.env.local`:

- `DATABASE_URL` and `DIRECT_URL` (PostgreSQL connection strings)
- `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `ANTHROPIC_API_KEY`

Ask a maintainer for access to the development Clerk instance and database credentials. Never commit `.env` files.

## Branch Naming

All branches must follow the pattern `<type>/<short-description>`:

| Prefix | Purpose |
|--------|---------|
| `feat/` | New feature or capability |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `refactor/` | Code restructuring with no behavior change |
| `test/` | Adding or updating tests |
| `chore/` | Tooling, CI, dependency updates |

Examples: `feat/5r-template-builder`, `fix/consent-gate-race-condition`, `docs/api-reference`.

## Commit Messages

Use conventional commit format:

```
<type>(<scope>): <short summary>

<optional body explaining why, not what>
```

Keep the summary line under 72 characters. Reference issue numbers where applicable (e.g., `closes #42`).

## Pull Request Process

1. Create a branch from `main` following the naming convention above.
2. Make your changes. Ensure `npm run lint` and `npm run build` pass locally.
3. Write or update tests. Every PR must include tests that cover the changed behavior.
4. Push your branch and open a pull request against `main`.
5. Fill in the PR template: summary, test plan, and compliance notes if the change touches student data.
6. Request review from at least one maintainer.
7. Address review feedback. The PR must pass all CI checks before merge.

## Test Requirements

All pull requests must include tests. The project uses:

- **Vitest** for unit and integration tests (`npm test`)
- **Playwright** for end-to-end tests (`npm run test:e2e`)

Run the full suite before opening a PR:

```bash
npx vitest run          # Unit and integration tests
npm run lint            # ESLint
npm run build           # TypeScript and Next.js build
```

## Code Review Checklist

Reviewers should verify:

- [ ] Tests cover the happy path and at least one error path.
- [ ] `tenantId` is included in every Prisma query touching tenant-scoped data.
- [ ] API routes use `withApiHandler` for consistent error handling and logging.
- [ ] Auth checks use `requireUser()` or `requireRole()` from `src/lib/auth.ts`.
- [ ] No PII is logged or sent to external services outside the approved pipeline.
- [ ] FERPA/COPPA-sensitive changes include an audit log call (`appendImmutableAuditLog`).
- [ ] AI-facing changes pass through the `GuardrailsEngine` pre- and post-generation checks.
- [ ] No secrets, API keys, or credentials are present in the diff.

## Reporting Issues

Open a GitHub issue with a clear title, reproduction steps, expected versus actual behavior, and any relevant logs. Tag the issue with the appropriate label (`bug`, `enhancement`, `compliance`).
