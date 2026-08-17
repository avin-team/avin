# Service Advisor controlled beta runbook

This runbook is for the `qwen/qwen3.6-27b` Preview model. The product copy must continue to call Service Advisor an AI beta until an allowlisted production vision model (or a promoted Groq model) passes the compatibility, Playbook, privacy, authorization, and multimodal suite again.

## Rollout controls

The API evaluates one stable subject per request: the authenticated User ID, or the hashed Visitor capability. The assignment is deterministic for the salt, so the same participant does not move between buckets during a deployment.

Configure these server-only variables:

| Variable | Meaning | Beta value |
| --- | --- | --- |
| `ADVISOR_BETA_ENABLED` | Global rollout kill switch | `true` |
| `ADVISOR_BETA_ROLLOUT_PERCENT` | Percentage of eligible traffic | `10` |
| `ADVISOR_BETA_ALLOWLIST` | Comma-separated User IDs or Visitor hashes for internal preview | restricted list |
| `ADVISOR_BETA_SALT` | Stable assignment namespace | rotate only with a deliberate re-bucketing decision |

Provider disablement remains an independent kill switch. It disables model generation without disabling catalog browsing or deleting bounded sessions. When either switch is off, the Advisor returns an unavailable/manual-browse state; existing sessions remain available for deletion, retention cleanup, and future resumption after recovery.

## Before enabling public traffic

1. In Admin, verify the exact Groq organization/key has Zero Data Retention enabled. Activate only after the provider contract and ZDR checks pass.
2. Run the internal/Admin preview with positive, ambiguous, exclusion, no-match, text-only, image-assisted, cross-session, secret-redaction, and provider outage cases.
3. Seed at least two eligible Sellers and verify stale Listing/package revalidation and explicit Checkout handoff. Confirm that no Cart or Checkout mutation occurs during Advisor turns.
4. Set the allowlist for internal reviewers, deploy with the 10-percent value, and verify the Admin Operations → Advisor panel shows the rollout state, model, request/token usage, error counts, and latency p95 values.
5. Exercise the manual catalog path while the provider is disabled, then restore the provider and verify a bounded session can resume.

## Rollback triggers

Disable `ADVISOR_BETA_ENABLED` or the provider immediately for any of the following:

- privacy, authorization, public-URL, secret-logging, or unintended commerce mutation defect;
- loss or expiry of Groq Zero Data Retention verification;
- model withdrawal, contract drift, or an unallowlisted model response;
- daily request/token quota exhaustion or sustained rate limiting;
- first-token p95 above 3 seconds, text-turn p95 above 15 seconds, image-turn p95 above 25 seconds, or hard timeouts above the agreed error budget;
- unsafe, unsupported, stale, or no-match behavior that bypasses the Playbook completion gate.

Record the trigger, deployment ID, provider status, observed metrics, and last known-good configuration in the incident Jira issue. Keep the marketplace and manual catalog browsing paths enabled.

## Promotion gate

Do not increase the percentage beyond 10 until the repeated suite is green and the model is production-supported or an allowlisted production vision model is configured. Preserve the beta label and this rollback path for the Preview model's entire public lifetime.
