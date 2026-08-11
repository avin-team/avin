# Route Notifications by affected party and keep Operations data safe

AVIN-25 routes each Notification to the affected Buyer, Seller, or authorized Admin rather than broadcasting every event. Notification content carries safe context and an authorized detail target; sensitive bank, KYC, chat, evidence, and financial snapshots are fetched only through the relevant protected workflow. Email delivery is bounded to five attempts over 24 hours, deduplicated by event, recipient, and channel, and exposes terminal failures for Admin retry. P0 adds reconciliation, read-only Transaction exploration, generic audit history, and email-delivery health to the Operations console without adding template editing or user preference management.

## Considered Options

- Broadcast every event to every Admin — rejected because it creates noisy shared queues and unnecessarily broad exposure.
- Embed full domain snapshots in Notifications — rejected because a stale or forwarded alert could disclose sensitive data outside the authorized detail workflow.
- Retry email indefinitely — rejected because permanent delivery failures would never become visible operational work.
- Add template and preference management in AVIN-25 — rejected to keep the issue focused on reliable lifecycle delivery and operations visibility.

## Consequences

Each event family needs an explicit recipient rule and a safe detail target. The Notification API and DTOs must separate alert context from domain detail, while the Operations console must make failed email delivery and immutable financial/audit history inspectable without becoming an owner of those domains.

## Definition of Done

AVIN-25 is complete when the Notification inbox and the four P0 Operations surfaces have role-protected APIs and UI, and tests cover the event catalog's recipients, deduplication, read state, authorization, redaction, and worker concurrency. Existing SellerApplication, Listing, Dispute, Wallet, and Seller Enforcement workflows remain dependencies and are not rewritten unless an integration seam is required.
