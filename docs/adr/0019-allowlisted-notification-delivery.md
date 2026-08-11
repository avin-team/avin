# Use an allowlisted lifecycle catalog with durable Notification delivery

AVIN-25 creates Notifications only for allowlisted successful lifecycle outcomes from SellerApplication submitted/approved/rejected; Listing hidden/restored/archived; every committed OrderItem lifecycle transition; Dispute opened/deadline/resolved; important deposit, withdrawal, refund, and reversal Transaction outcomes; Seller Enforcement action applied/lifted/appeal resolved and Enforcement Remediation needing attention; and Review created. The durable database/API remains the source of truth; realtime delivery is a best-effort update signal and reconnects recover through the Notification inbox. Critical financial, SellerApplication, Enforcement, Dispute, deposit, and withdrawal outcomes also create separate retryable email-delivery records, while an email failure never rolls back the committed business event or in-app Notification.

## Considered Options

- Create Notifications for every database mutation — rejected because failed commands, internal retries, and read-only work would become user-visible noise.
- Use realtime as the Notification source of truth — rejected because disconnected clients would lose alerts and Admin realtime access is not yet sufficiently scoped and audited.
- Send email for every in-app Notification — rejected because routine fulfillment and Chat activity do not justify email volume.

## Consequences

Each domain must name its successful Notification-producing outcomes and its recipients. The generic Notification model needs a source reference that is not limited to OrderItem, while email delivery can retry independently and expose terminal failures to the Operations console.
