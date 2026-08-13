# Vercel production checklist: plan and Supabase notes

Checked: **2026-08-13**

Scope: first-party Vercel and Supabase documentation only. This note records what is actionable on the current Vercel Hobby plan, what becomes available on Pro, and which checklist items should be treated as Enterprise-only. It is supporting research for a separate code and dashboard audit; it does not claim that a dashboard-only feature is enabled.

## Launch-level conclusion

If this is a commercial application, upgrade before production launch. Vercel restricts Hobby to personal, non-commercial use; commercial use requires Pro or Enterprise ([Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)).

Most launch fundamentals are not Enterprise-gated: CSP and security headers, a committed lockfile, incident and rollback documentation, cache policy/ISR, tracing instrumentation, image/script/font optimization, function-region alignment, Fluid compute, Vercel Authentication for non-production URLs, basic WAF rules, bot rules, rate limiting, and Speed Insights can all be addressed before the upgrade. Pro is the relevant launch target because it adds commercial use, team roles, Drains, Observability Plus eligibility, Spend Management, richer rollback, custom environments, and optional preview-domain/SAML features.

## Checklist availability by plan

### Operational excellence

| Checklist area | Hobby now | Pro target | Enterprise distinction |
| --- | --- | --- | --- |
| Incident response and escalation | Team process; no plan gate | Same | Enterprise support/SLAs may alter escalation paths |
| Stage, promote, rollback | Preview deployments and promotion are available; rollback is limited to the immediately previous production deployment | Can roll back to any deployment that previously served production traffic; dedicated custom environments are available | Custom contractual support/controls |
| Monorepo build caching | Vercel Remote Cache is available on all plans and is automatic in Vercel builds when Turborepo is configured; Hobby fair-use allowance is lower | Same feature, higher fair-use allowance | Higher allowance |
| Zero-downtime DNS migration | Plan-independent operational procedure | Same | Same |

Sources: [promoting deployments](https://vercel.com/docs/deployments/promoting-a-deployment), [Instant Rollback](https://vercel.com/docs/instant-rollback), [Remote Caching](https://vercel.com/docs/monorepos/remote-caching), [zero-downtime migration](https://vercel.com/kb/guide/zero-downtime-migration).

Important operational details:

- A preview-to-production promotion performs a production rebuild and uses production environment variables. A staged production build can instead be promoted without rebuilding.
- Instant Rollback restores an existing deployment, so environment-variable changes made after that build are not incorporated. After rollback, automatic production-domain assignment is disabled until the rollback is undone by promoting a deployment.
- For a DNS cutover, keep the current DNS provider initially, add/verify the domain and certificate on Vercel, then change the requested A/CNAME records. Do not begin by switching nameservers. Vercel's domain settings provide the exact target records.

### Security

| Capability | Hobby now | Pro target | Enterprise distinction |
| --- | --- | --- | --- |
| CSP and security headers | Application/framework configuration; no plan gate | Same | Conformance can audit rules on Enterprise |
| Deployment Protection | Vercel Authentication with Standard Protection protects preview/deployment URLs but leaves the production domain public | Same base method; protecting all deployments and Password Protection require the Advanced Deployment Protection add-on | Advanced protection included; Trusted IPs available |
| WAF custom rules and project IP blocks | Up to 3 custom rules and 10 IP blocks | Up to 40 rules and 100 IP blocks | Custom limits, account-level blocking, OWASP Core Ruleset |
| WAF rate limiting | Available; fixed window, one rule per project, metered after included requests | Available; fixed window, up to 40 rules | Additional keys/token-bucket algorithm and higher limits |
| Bot blocking | Bot Protection and AI Bots managed rulesets are available on all plans | Same | Same, plus broader Enterprise WAF options |
| Drains / persistent logs | Not available; runtime-log retention is one hour | Drains available and metered; normal runtime-log retention is one day, or 30 days with Observability Plus | Drains available; Enterprise retention differs |
| Preview Deployment Suffix | Not available | Available as a $100/month add-on | Included/enabled by default; suffix domain must use Vercel nameservers |
| Team roles | No team collaboration for a private repository | Team-level roles and invitations available | Project-level roles, security role, and access groups add more granularity |
| SAML SSO | Not available | Available as a $300/month add-on | Available; owner configures it |
| SCIM / Directory Sync | Not available | Not available | Enterprise only; owner configures it |
| Audit Logs | Not available | Not available | Enterprise only; owner access |
| Allowed-cookie policy | Secure cookie design is an application responsibility on every plan | Same | Vercel's `SET_COOKIE_VALIDATION` Conformance rule is Enterprise-only |

Sources: [Deployment Protection](https://vercel.com/docs/deployment-protection), [Vercel WAF limits](https://vercel.com/docs/vercel-firewall/vercel-waf), [WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), [WAF managed rulesets](https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets), [Drains](https://vercel.com/docs/drains), [runtime-log limits](https://vercel.com/docs/logs/runtime), [Preview Deployment Suffix](https://vercel.com/docs/deployments/preview-deployment-suffix), [access roles](https://vercel.com/docs/rbac/access-roles), [SAML](https://vercel.com/docs/saml), [Directory Sync](https://vercel.com/docs/directory-sync), [Audit Logs](https://vercel.com/docs/audit-log), [Conformance rules](https://vercel.com/docs/conformance/rules).

Current self-serve add-on prices are from [Vercel pricing](https://vercel.com/docs/pricing); re-check the dashboard before purchase because pricing can change.

Plan nuance: the production checklist groups SAML SSO and SCIM under an Enterprise annotation, but the current SAML documentation explicitly offers SAML as a paid Pro add-on. SCIM/Directory Sync remains Enterprise-only.

SSL is automatic on Vercel, but the cutover audit should check conflicting A/CNAME records, CAA authorization for Let's Encrypt, stale `_acme-challenge` records, and rewrites of `/.well-known`. Wildcard certificates require Vercel nameservers ([Vercel domain troubleshooting](https://vercel.com/docs/domains/troubleshooting)).

### Reliability and performance

| Capability | Hobby now | Pro target | Enterprise distinction |
| --- | --- | --- | --- |
| Base Observability | Available | Available | Available |
| Observability Plus | Not available | Optional $10/month base upgrade plus metered events | Optional upgrade |
| Automatic Function failover | Not available | Not available | Enterprise only |
| Secure Compute passive failover | Not applicable | Not available | Secure Compute is an Enterprise add-on; passive failover can be configured |
| CDN caching and ISR | Static-file CDN caching and ISR are available on all plans | Same, with higher usage allowances | Contract/custom allowances |
| OpenTelemetry instrumentation | `@vercel/otel` instrumentation is supported; code can be added independently of plan | Same; trace Drains require Pro or Enterprise | Enhanced tracing/drain options |
| Speed Insights | Available on one Hobby project, 10,000 monthly data points, seven-day window | Available with a per-project base charge and 30-day window | Longer retention |
| Function regions | One chosen region; default for new projects is `iad1` | Up to three regions | Unlimited/custom regions plus explicit failover regions |
| Load testing | Vercel's checklist marks this Enterprise-only; load testing without authorization is prohibited by Fair Use | Do not run against Vercel without authorization | Coordinate an approved test with Vercel and upstream providers |

Sources: [Observability](https://vercel.com/docs/observability), [Observability Plus](https://vercel.com/docs/observability/observability-plus), [function regions and failover](https://vercel.com/docs/functions/configuring-functions/region), [Vercel regions](https://vercel.com/docs/regions), [CDN cache](https://vercel.com/docs/caching/cdn-cache), [ISR](https://vercel.com/docs/incremental-static-regeneration), [tracing instrumentation](https://vercel.com/docs/tracing/instrumentation), [Speed Insights limits](https://vercel.com/docs/speed-insights/limits-and-pricing), [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines).

Caching guidance from Vercel:

- Static files are cached automatically. Dynamic, non-user-specific responses can use `Cache-Control`, `CDN-Cache-Control`, or `Vercel-CDN-Cache-Control`; do not cache responses carrying private user data or `Set-Cookie`.
- Prefer framework ISR for pages that update on a schedule or by explicit event. ISR adds durable storage, cache shielding, request collapsing, globally consistent purging, and rollback-aware behavior that response headers alone do not provide.
- Function response headers take priority over `next.config`/`vercel.json` headers. See [Cache-Control headers](https://vercel.com/docs/caching/cache-control-headers).

### Cost optimization

| Capability | Hobby now | Pro target | Enterprise distinction |
| --- | --- | --- | --- |
| Fluid compute | Available; enabled by default for projects created since 2025-04-23 | Available | Available/configuration may depend on an older Enterprise contract |
| Spend Management | Not available | Available to Owner/Billing roles; notifications at 50%, 75%, and 100%, with webhook or project-pause action | Enterprise billing is contract-specific |
| Function duration/memory | Fluid default/max duration is 300s; fixed 2 GB/1 vCPU | Duration configurable up to 800s; 2 GB/1 vCPU or 4 GB/2 vCPU | Custom/higher contractual options may apply |
| ISR revalidation | Available; tune schedule or use on-demand revalidation | Same | Same |
| New image pricing opt-in | Hobby is already on the current model | Current model applies | Only Enterprise teams created before 2025-02-18 may remain on the legacy model until contract expiry |
| Large media | Move GIF/video payloads to object/blob storage; no plan-specific exception | Same | Same |

Sources: [Fluid compute](https://vercel.com/docs/fluid-compute), [Spend Management](https://vercel.com/docs/spend-management), [function duration](https://vercel.com/docs/functions/configuring-functions/duration), [function memory](https://vercel.com/docs/functions/configuring-functions/memory), [image optimization pricing](https://vercel.com/docs/image-optimization/limits-and-pricing).

## Supabase-specific production checks

### Region alignment

Each Supabase project has one primary AWS region. Vercel defaults new Function projects to `iad1` (`us-east-1`), so the dashboard/code audit must compare the actual Supabase region rather than accept Vercel's default. Common exact mappings are:

| Supabase AWS region          | Matching Vercel region |
| ---------------------------- | ---------------------- |
| `ap-southeast-1` Singapore   | `sin1`                 |
| `ap-northeast-1` Tokyo       | `hnd1`                 |
| `ap-northeast-2` Seoul       | `icn1`                 |
| `ap-southeast-2` Sydney      | `syd1`                 |
| `us-east-1` North Virginia   | `iad1`                 |
| `us-west-1` North California | `sfo1`                 |
| `us-west-2` Oregon           | `pdx1`                 |
| `eu-central-1` Frankfurt     | `fra1`                 |
| `eu-west-2` London           | `lhr1`                 |

Sources: [Supabase regions](https://supabase.com/docs/guides/platform/regions), [Vercel region mapping](https://vercel.com/docs/regions). Vercel recommends running Functions in the same region as the database or as close as possible. A single database-backed application generally gains more from one database-local Function region than from multiple write regions unless the data layer also has an appropriate replica strategy.

### Connection mode

- Browser/frontend access should use the Supabase Data API/client library with a publishable key and RLS.
- If serverless Functions connect using a Postgres URL, Supabase recommends transaction pooling for temporary/serverless connections: shared Supavisor on port `6543` (or the paid dedicated pooler when network support permits). Transaction mode does not support prepared statements, so the database client must disable them.
- Use direct connections for migrations, backup/restore, replication, or long-lived backends—not transient serverless traffic. Require SSL wherever possible.

Source: [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

### Database and credential security

Before launch, verify the Supabase dashboard as well as repository migrations:

- Run Security Advisor and enable RLS with least-privilege policies on every table in an exposed schema. Tables created through raw SQL do not automatically get the Table Editor's RLS behavior.
- Keep Supabase publishable keys client-side only. Secret keys and legacy `service_role` keys bypass RLS and must remain server-only, out of source, client bundles, URLs, and logs. Supabase states legacy `anon`/`service_role` keys are being deprecated by the end of 2026, so plan a move to publishable/secret keys.
- Enable Postgres SSL Enforcement; enable database Network Restrictions when the connection architecture supports it; require MFA for Supabase/GitHub administrators; keep more than one organization owner; review email confirmation, OTP expiry (Supabase recommends at most one hour), and custom SMTP if Supabase Auth sends production email.
- Network Restrictions affect direct Postgres and pooler connections, not HTTPS APIs such as PostgREST/Auth/Storage or `supabase-js`. Vercel Functions use dynamic outbound IPs by default. If direct database IP allowlisting is required after moving to Pro, Vercel's Static IPs feature provides regional stable egress; Secure Compute is the dedicated Enterprise alternative.

Sources: [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Network Restrictions](https://supabase.com/docs/guides/platform/network-restrictions), [Vercel static IP/allowlisting guidance](https://vercel.com/kb/guide/how-to-allowlist-deployment-ip-address).

### Vercel environments and Supabase previews

Vercel Production maps to the production branch; other Git branches normally use Preview. On Hobby, a staging branch is implemented by scoping Preview variables to that branch. Pro supports a dedicated `staging` custom environment with branch tracking. If Supabase branching is used, its Vercel integration synchronizes branch-specific variables when the pull request opens and then redeploys the latest PR deployment to resolve the documented synchronization race. Set Supabase Auth's `SITE_URL` to the canonical production URL, use exact production redirect paths, and separately allow the intentional Vercel preview pattern.

Sources: [Supabase explanation of Vercel environments](https://supabase.com/docs/guides/troubleshooting/vercel-integration-environment-variables-not-syncing-for-persistent-git-branches-b9191e), [Supabase branching integration](https://supabase.com/docs/guides/deployment/branching/integrations), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Recommended plan-scoped order

1. Before upgrading: complete code-level headers/caching/performance work, confirm the lockfile and Turborepo outputs, document incident/rollback/DNS procedures, align the Function region, configure Vercel Authentication for non-production deployments, add conservative WAF/bot/rate-limit rules in log mode first, and validate Supabase RLS/keys/SSL/auth settings.
2. Before commercial launch: upgrade to Pro, configure Spend Management immediately, decide whether Drains and Observability Plus are worth their metered/add-on cost, assign least-privilege team roles, and create a dedicated staging environment if needed.
3. Treat Preview Deployment Suffix, SAML, Static IPs, Advanced Deployment Protection, and Rolling Releases as optional Pro add-ons/features justified by the operating model—not baseline blockers.
4. Mark automatic Function failover, Secure Compute passive failover, SCIM/Directory Sync, Audit Logs, OWASP Core managed rules, load testing through Vercel, Enterprise Conformance cookie validation, and Enterprise proxy consultation as not applicable to the planned Pro launch unless requirements change.
