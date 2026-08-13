# Vercel production readiness

Last audited: 2026-08-13

Target: Vercel Pro for the commercial launch. Vercel Hobby is suitable only for personal, non-commercial use. The `web` and `admin` apps are Vite SPAs; the Hono `server` is a separate long-lived service with Supabase and SePay dependencies.

Status meanings:

- **Ready**: verified in source or by a linked-service check.
- **Partial**: useful protection exists, but a launch action remains.
- **Pending**: cannot be verified or completed from this repository.
- **N/A**: does not apply to the planned Pro launch or current architecture.

The plan and product availability claims in this audit are sourced in [`docs/research/vercel-production-checklist-plan-notes.md`](../research/vercel-production-checklist-plan-notes.md).

## Launch blockers

Do not launch commercially until all of these are closed:

1. Upgrade the Vercel team from Hobby to Pro.
2. Decide and document where `apps/server` runs. The repository has Vercel configurations only for `apps/web` and `apps/admin`. The server starts four in-process interval workers, which are not compatible with request-scoped serverless execution without moving them to durable cron/queue jobs.
3. Replace every production `localhost` environment value. Set the canonical HTTPS API URL in `VITE_SERVER_URL`, the API origin in `BETTER_AUTH_URL`, and the exact web/admin origins in `CORS_ORIGIN` and Better Auth trusted origins.
4. Confirm the actual Supabase AWS region. The example pooler is Singapore (`ap-southeast-1`); if that is the live region, colocate the API in Singapore and use Vercel `sin1` for any database-backed Functions.
5. Configure dashboard protections: Standard Deployment Protection for both Vercel projects, WAF rate limits and bot rules, team roles, Spend Management, and Speed Insights for the public web project.
6. Create the incident communication channel and name a primary and backup incident commander. The process below is defined, but people and channels cannot be inferred from source.
7. Complete the custom-domain and DNS preflight before changing any record.

## Repository and service findings

### Operational excellence

| Item | Status | Evidence or action |
| --- | --- | --- |
| Incident response plan | Partial | The runbook below defines severity, escalation, communication, and rollback. Assign people and create `#avin-incidents` before launch. |
| Stage, promote, rollback | Ready | The runbook below uses Preview, staged production, promotion, smoke tests, and Instant Rollback. Exercise it once before launch. |
| Monorepo build caching | Ready | `turbo.json` declares build inputs, dependency builds, and `dist/**` outputs. Vercel Remote Cache is automatic for Turborepo builds. |
| Zero-downtime DNS migration | Pending | Follow the DNS runbook after the production domains and current DNS provider are known. |

### Security

| Item | Status | Evidence or action |
| --- | --- | --- |
| CSP and security headers | Ready | Both Vercel SPAs now set CSP, clickjacking, MIME-sniffing, referrer, opener, and permissions headers. The API uses Hono secure headers. Tighten `connect-src` from generic HTTPS/WSS to the canonical API and Supabase hosts after domains are fixed. |
| Deployment Protection | Pending | Enable Vercel Authentication with Standard Protection on both projects. This protects previews/deployment URLs while leaving production domains public. |
| WAF custom rules and IP blocking | Pending | Start rules in log mode. Block known abusive IPs only from evidence; do not invent an allowlist that could block SePay. OWASP Core Rules is Enterprise-only. |
| Log Drains | Pending | Available after the Pro upgrade. Drain Vercel logs only if the Vercel projects gain Functions; separately persist Hono server logs because it is currently the important runtime. Redact cookies, authorization headers, tokens, bank details, and webhook payloads. |
| SSL certificate review | Pending | Check conflicting records, CAA authorization, stale `_acme-challenge` records, and `/.well-known` rewrites during DNS preflight. |
| Preview Deployment Suffix | N/A | Optional $100/month Pro add-on, not a launch requirement. |
| Lockfile | Ready | `bun.lock` is committed and the root pins `bun@1.3.13`. |
| Rate limiting | Partial | Better Auth enables production rate limiting. Add WAF limits for auth, upload, RPC mutation, and SePay paths. The SePay webhook must be keyed conservatively and continue accepting legitimate retries. |
| Team access roles | Pending | On Pro, keep the minimum number of Owners, assign Members for deploy work, and reserve Billing access. Require MFA for Vercel, GitHub, Supabase, SePay, and Google Cloud operators. |
| SAML SSO | N/A | Optional $300/month Pro add-on; adopt only when the team/identity requirements justify it. |
| SCIM | N/A | Enterprise-only. |
| Audit Logs | N/A | Vercel Audit Logs are Enterprise-only. Avin already stores domain/admin audit events; these do not replace platform audit logs. |
| Allowed cookie policy | N/A | The Vercel Conformance rule is Enterprise-only. Better Auth production cookies are `HttpOnly`, `Secure`, and explicitly scoped by SameSite behavior; UI preference cookies contain no credentials. |
| Unwanted bots | Pending | Enable Bot Protection and the AI Bots managed ruleset. Verify public catalog SEO crawlers still work before switching from log to deny/challenge. |

Supabase verification performed during this audit:

- Linked remote/local migration histories match.
- Security Advisor reports no warning-level security findings.
- The performance advisor found three duplicate indexes. Migration `0030` removes only the redundant copies; review and apply it through the normal Drizzle deployment workflow.
- The browser receives only the Supabase URL and publishable key. Secret/S3/JWT credentials remain server environment variables.
- Before launch, enable hosted database SSL enforcement and confirm MFA and at least two organization owners in the Supabase dashboard.

### Reliability

| Item | Status | Evidence or action |
| --- | --- | --- |
| Observability Plus | Pending | Optional after Pro upgrade. Start with base observability; buy Plus only if its retention and event pricing fit the launch budget. |
| Automatic Function failover | N/A | Enterprise-only; the current Vercel apps are static. |
| Secure Compute passive failover | N/A | Enterprise-only and Secure Compute is not in use. |
| Static/Function cache headers | Ready | Vite hashed `/assets/*` receive a one-year immutable browser cache. Vercel caches static files. Authenticated API responses must remain private and uncached unless a response is proven public. |
| Cache headers versus ISR | Ready | Avin is a Vite SPA, so Next.js-style ISR is not used. Static asset caching and API response caching are the relevant mechanisms. |
| Distributed tracing | Pending | No OpenTelemetry/Sentry instrumentation exists. Instrument the long-lived Hono deployment once its hosting platform and log destination are selected. Include request IDs across the API, Supabase calls, SePay reconciliation, and email delivery without recording secrets or financial payloads. |
| Load test | N/A | Do not load-test Vercel on Hobby/Pro without authorization. Test business services locally or in an authorized staging environment, and coordinate with Supabase/SePay. |

### Performance

| Item | Status | Evidence or action |
| --- | --- | --- |
| Speed Insights | Partial | The public web app includes `@vercel/speed-insights`. Enable Speed Insights for that Vercel project; Hobby supports one project. The admin app does not need field-vitals telemetry initially. |
| TTFB | Partial | Static Vite HTML/assets are CDN-served. Measure API TTFB after the API host and region are final; inspect p50/p95/p99 separately for public reads and financial writes. |
| Image Optimization | Pending | The web app uses raw `<img>` tags, including user/listing media, so Vercel Image Optimization is bypassed. Adopt a constrained `/_vercel/image` wrapper or an image-aware framework/component, with an allowlist for the exact Supabase project host. |
| Script Optimization | Partial | Vite emits hashed bundles and TanStack Router automatic code splitting is enabled. No third-party browser script was found. The admin production build still warns about a 513 kB minified entry chunk; split that internal bundle after higher-risk launch work. |
| Font Optimization | Ready | No external Google Fonts/network font request was found. |
| Function/database region | Pending | The Vercel apps have no Functions today. Any future database-backed Function should match Supabase; Singapore maps to `sin1`. |
| Third-party proxy review | N/A | Enterprise-only consultation; no proxy was identified. |

### Cost optimization

| Item | Status | Evidence or action |
| --- | --- | --- |
| Fluid compute | N/A | No Vercel Functions are currently configured. Enable/verify it only if the API moves to Vercel after its workers are separated. |
| Manage and optimize usage | Pending | Review Vercel Usage weekly for the first month; track edge requests, transfer, image transformations, Speed Insights, and drains. Track Supabase database/storage/egress and SePay/API usage separately. |
| Spend Management | Pending | Enable immediately after the Pro upgrade. Notify at 50% and 75%; at 100%, alert via webhook before considering project pause because pausing can interrupt payments. |
| Function duration and memory | N/A | No Vercel Functions. Set explicit values after measuring if that changes. |
| ISR revalidation | N/A | No ISR in the Vite SPA. |
| New image pricing opt-in | N/A | The legacy choice applies only to older Enterprise teams, not this project. |
| Large media to blob storage | Ready | User/listing/order media already uses Supabase Storage. The repository contains only a small set of static PNG seed assets; optimize them separately, but no video/GIF payload is committed. |

## Incident response runbook

### Roles and escalation

Before launch, replace bracketed values:

- Incident commander: `[primary Vercel team owner/on-call maintainer]`.
- Backup incident commander: `[backup maintainer]`.
- Security/data lead: `[Supabase and Better Auth owner]`.
- Payments lead: `[SePay and ledger owner]`.
- Internal channel: `#avin-incidents` `[create and record workspace link]`.
- Customer channel: `[status page URL or public support channel]`.
- Evidence/timeline: create a highest-priority Jira issue in project `AVIN` and record timestamps, deploy IDs, decisions, mitigations, and follow-ups.

Severity and escalation:

- **SEV-1**: incorrect wallet/ledger state, payment duplication/loss, credential exposure, unauthorized admin/data access, or total outage. Page primary and backup immediately. Notify Supabase/SePay/Vercel support as relevant within 15 minutes. Give customer updates every 30 minutes.
- **SEV-2**: major purchase, authentication, upload, or seller workflow failure without known data corruption. Engage the incident commander within 15 minutes and update hourly.
- **SEV-3**: degraded or isolated behavior with a workaround. Track in Jira and resolve in normal engineering hours.

### First response

1. Declare severity, commander, start time, affected surface, and last known good deployment in `#avin-incidents` and the Jira incident.
2. Preserve evidence. Do not expose secrets or full SePay/bank payloads in chat, tickets, screenshots, logs, or Vercel comments.
3. Determine whether impact is frontend-only, API, Supabase, SePay, email, storage, or a schema/data change.
4. Contain narrowly: use a WAF rule for an abusive path/IP, disable only the affected mutation, or place the affected workflow in maintenance mode. Keep signed SePay event evidence durable; do not blindly replay webhooks.
5. Compare the current deployment and environment variables with the last known good deployment. Check Vercel, API-host, Supabase, and SePay status pages.

### Rollback strategy

- Frontend-only regression: use Vercel Instant Rollback to the last known good production deployment, smoke-test, then communicate recovery. Remember that rollback restores the old build's environment assumptions.
- API regression: roll back through the API hosting platform. Do not point the frontend at an unverified preview API.
- Database migration: prefer backward-compatible expand/contract migrations. Never automatically reverse a migration that may have accepted production writes. Roll application code forward or deploy a reviewed corrective migration.
- Financial incident: stop the affected command path, preserve immutable ledger history, reconcile provider events, and correct through an explicit reversal transaction. Never edit/delete ledger postings or credit a user manually by bypassing the reconciliation model.
- Credential exposure: revoke/rotate first, update deployment secrets, redeploy, invalidate affected sessions where applicable, and then investigate scope.

Close only after smoke tests, monitoring recovery, provider reconciliation, a customer update, and a scheduled post-incident review with owners and due dates.

## Deployment and promotion runbook

1. Merge only with `bun run check`, `bun run check-types`, `bun run test`, and `bun run build` passing.
2. Build a Preview deployment with Preview-scoped non-production credentials. Never use production SePay secrets in arbitrary branch previews.
3. Smoke-test public catalog, buyer/seller/admin authentication, 2FA enforcement, checkout, upload/download authorization, wallet deposit creation, a signed SePay webhook fixture, reconciliation idempotency, and email queue behavior.
4. Apply reviewed backward-compatible Drizzle migrations before code that requires them. Confirm advisor output and migration status.
5. Create a staged production deployment using production variables, then promote that exact deployment. Record its deployment ID and schema version.
6. Watch errors, latency, Supabase connections, SePay reconciliation, ledger invariants, email retries, and WAF events through the observation window.
7. Exercise Instant Rollback once in staging before launch and record the last known good deployment.

## Zero-downtime DNS runbook

1. At least 24–48 hours before cutover, lower the relevant existing TTLs to 300 seconds. Record every current DNS record and mail/security record.
2. Add the domain to Vercel and complete ownership verification while the old site remains authoritative. Resolve CAA, conflicting A/CNAME, and certificate issues first.
3. Deploy and verify production using the generated Vercel URL. Confirm the CSP, API CORS/trusted origins, Better Auth callbacks, Supabase redirect allowlist, Google OAuth callbacks, SePay webhook URL, and email links use canonical HTTPS domains.
4. Change only the A/CNAME records Vercel specifies. Do not switch nameservers as the first migration step. Keep the old origin running during propagation.
5. Monitor both old and new origins until DNS has converged, then restore a normal TTL. Move nameservers later only if Vercel DNS is explicitly desired and every non-web record has been copied and verified.
6. Roll back by restoring the recorded old A/CNAME targets while the old origin is still available. DNS rollback does not undo database writes.

## Audit validation

The following passed on 2026-08-13:

- `bun run check`
- `bun run check-types`
- `bun run build`
- `bun x drizzle-kit check` from `packages/db`
- web tests: 41 files, 105 tests
- API tests: 34 files, 175 tests
- auth tests: 2 files, 4 tests
- new web/admin deployment configuration tests: 4 tests
- admin tests: 16 files, 44 tests
