# Make Seller Enforcement an immediate gate with idempotent remediation

**Status**: accepted

Seller Enforcement is a marketplace policy owned separately from authentication account locks. An Enforcement Action takes effect immediately and suppresses Store/Listing eligibility; ban consequences for eligible pre-delivery OrderItems are then applied by a tracked, retryable, idempotent remediation process, while each committed OrderItem or financial transition remains authoritative according to commit order. We chose this boundary over one cross-aggregate transaction or delaying enforcement until refunds finish because Seller actions and new Checkout attempts must be blocked immediately, while remediation must remain safe for a Seller with many independent OrderItems and EscrowHolds.

The remediation process cannot skip a required refund, mark itself complete with unresolved items, or edit financial history; corrections use normal ledger reversal semantics. Listing states, delivered/warranty/disputed items, and SellerWallet accounting remain independent so lifting enforcement can restore only otherwise-eligible public visibility without rewriting historical outcomes.
