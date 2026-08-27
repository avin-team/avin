# End-to-end tests

Playwright exercises the storefront and admin apps against either local services or deployed environments. Chromium is the initial browser target so the feedback loop stays fast; add browser projects when a flow needs compatibility coverage.

## Structure

```text
e2e/
├── package.json    # Isolated Playwright package and commands
├── playwright.config.ts
├── scripts/        # Explicit, one-time local account provisioning
└── src/            # Playwright test runtime source
    ├── setup/      # Login once per role and write ignored storage state
    ├── support/    # Environment, account, and auth-state configuration
    └── tests/
        ├── admin/  # Admin anonymous and authenticated journeys
        ├── risk/   # Reporter + Risk Moderator journeys
        └── web/    # Storefront, seller listing, OAuth boundary, and session journeys
```

Files ending in `.authenticated.spec.ts` run only when that app's complete set of E2E credentials is configured. Seller listing specs use `.seller.spec.ts` and require the approved seller account. Setup projects create `.auth/*.json` and authenticated projects depend on them. Anonymous projects always start with an empty storage state.

Add page objects only after multiple tests share a meaningful workflow. Keep one-off interactions in the test and prefer role, label, or visible-text locators over CSS selectors.

## Test accounts

Use dedicated accounts in a non-production database:

- A verified storefront account with a stable password. The public product can remain Google-only; its email/password endpoint is used only to establish an automated session without driving Google's UI.
- An approved SELLER account with a complete storefront profile. Its email/password endpoint is used only to establish an automated session for listing workflows; the account is local/CI-only and never a developer account.
- A dedicated `ADMIN` account with 2FA enabled. Store its password and raw Base32 TOTP secret in the CI secret manager. The setup project generates a current code and exercises the real admin email/password and 2FA screens.

Do not use a developer's Google or admin account. Do not commit credentials or generated storage state. The Google test checks Avin's OAuth request and mocks the third-party page boundary; it does not automate `accounts.google.com`.

For the local database, provision the stable E2E accounts once:

```bash
bun run test:e2e:provision
```

The idempotent provisioner writes secrets to `e2e/.env.local`, which is ignored. It reuses existing accounts and makes the dedicated seller workspace publish-ready (approved application, `v1.0` agreement, and profile). Alternatively, copy `e2e/.env.example` to `e2e/.env.local` and provide any account set. A partial credential set fails fast instead of silently skipping tests.

## Local

Install Chromium once, then run the suite:

```bash
bun run test:e2e:install
bun run test:e2e
```

When base URLs are unset, Playwright starts the API (`:3000`), web (`:3001`), and admin (`:5174`) apps and reuses instances already running on those ports. Override one or more URLs to target running services:

```bash
E2E_BASE_URL=http://localhost:4173 \
E2E_ADMIN_BASE_URL=http://localhost:4174 \
E2E_API_BASE_URL=http://localhost:4000 \
bun run test:e2e
```

Useful commands:

```bash
bun run test:e2e:auth
bun run test:e2e:seller
bun run test:e2e:risk-report
bun run test:e2e:smoke
bun run test:e2e:ui
bun run test:e2e -- --debug
```

## Production

Production requires an explicit HTTPS storefront URL and filters the suite to tests tagged `@prod-safe`. Authenticated projects are disabled in production, even if credentials are present:

```bash
E2E_BASE_URL=https://your-production-domain.example bun run test:e2e:prod
```

Set `E2E_ADMIN_BASE_URL` when the deployed admin should also receive anonymous read-only checks. Never tag a test `@prod-safe` if it creates accounts, orders, uploads, payments, reports, or any other persistent data.

## Conventions

- Navigate with relative paths so each project's `baseURL` selects the app.
- Keep tests independent and create unique test data per worker for mutations.
- Rely on Playwright assertions instead of fixed sleeps.
- Use `@auth` for auth coverage, `@seller` for seller listing mutations, `@smoke` for fast critical checks, and `@prod-safe` only for read-only flows.
- Inspect `e2e/playwright-report/` and `e2e/test-results/` after failures.
- Run package commands directly with `bun run --cwd e2e e2e`, or use the root aliases shown above.
