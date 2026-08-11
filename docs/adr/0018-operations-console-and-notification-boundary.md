# Keep the Operations Console as a read boundary and Notifications per-recipient

AVIN-25 keeps the Operations console as an Admin-only integration and read boundary: existing SellerApplication, Listing, Dispute, Wallet, and Seller Enforcement contexts retain ownership of their business commands, while the console adds missing cross-domain operational views. Notifications are durable per-recipient lifecycle alerts from any domain, with OrderItem transitions as only one source; Chat unread state remains separate, critical Notifications use a separate retryable email-delivery path, and only an allowlisted successful event may create a deduplicated alert.

## Considered Options

- Move all Admin commands into AVIN-25 — rejected because it would create a second owner for marketplace and financial rules.
- Keep Notification tied to OrderItem lifecycle events — rejected because SellerApplication, Listing, Wallet, and Seller Enforcement also have meaningful lifecycle alerts.
- Merge Chat unread state into Notification — rejected because a Message read cursor and a lifecycle alert have different meaning and retention.
- Derive Notifications from every database mutation — rejected because retries and internal writes would produce noisy, duplicate alerts.

## Consequences

The remaining AVIN-25 work is integration: missing deposit/reconciliation, Transaction, generic audit, and Notification-inbox views plus the delivery contract. The inbox supports per-recipient unread state, unread filtering, marking one or all alerts as read, and retains alerts rather than deleting them. Existing sensitive Admin workflows remain available, but their DTOs and field exposure must follow the authorized workflow; email delivery now belongs to this boundary despite the older AVIN-19 glossary note.
