# Use stable Notification events and a provider-neutral delivery boundary

AVIN-25 gives each allowlisted lifecycle outcome a stable event identity (`eventType`, `sourceType`, `sourceId`) and creates its in-app Notifications in the same transaction as the successful business event. The generic model must support SellerApplication, Listing visibility, OrderItem, Dispute, financial Transaction, Seller Enforcement, Enforcement Remediation, and Review without fabricating OrderItem lifecycle events. Notification payloads contain safe context and an authorized detail target; sensitive data is fetched only by the protected workflow.

Critical email is represented by a separate `EmailDelivery` record keyed by event, recipient, and channel. A provider-neutral sender adapter wraps the existing Resend integration, and a worker performs delivery after the business transaction commits. Delivery records expose `pending`, `retrying`, `sent`, and `failed` states, attempt history, next retry time, and the last error; retry stops after five attempts or 24 hours. An Admin may retry a terminal failure through an audited command, which starts one new bounded retry window rather than permitting infinite retries, while an email failure never rolls back the business event or in-app Notification. In-app Notifications and delivery records have no automatic retention/deletion policy in AVIN-25.

The current database contents are disposable pre-release data and will be reset before this model rolls out. The implementation therefore uses a clean schema without backfilling legacy Notifications, dual-reading old columns, or preserving OrderItem-specific compatibility fields. This applies to the current pre-release reset only; a later deployment with real users would require an explicit data migration plan.

## Considered Options

- Keep Notifications tied to `OrderItemLifecycleEvent` — rejected because several allowlisted sources are not OrderItem transitions.
- Backfill and dual-read the current Notification table — rejected for this pre-release because the current dataset is disposable and will be reset before rollout.
- Store separate source-ID columns or separate Notification tables per domain — rejected because it duplicates inbox, deduplication, and read-state behavior.
- Call Resend directly from each domain transaction — rejected because provider latency and failure would couple email delivery to business commits.
- Add a second email provider immediately — rejected because the existing Resend integration is sufficient; a provider-neutral boundary preserves a later replacement option.
- Audit every Admin list and aggregate read — rejected because it creates noise without improving accountability; sensitive detail reads and retry actions are sufficient for this scope.

## Consequences

Each source domain must publish a stable event identity and safe detail target. The Notification inbox is implemented separately in the web and Admin surfaces, reconnects from the database/API cursor, and does not depend on Chat unread state or realtime delivery. The Operations console exposes filtered, cursor-paginated reconciliation, Transaction, audit, and email-health surfaces, with mutations restricted to existing authorized commands.
