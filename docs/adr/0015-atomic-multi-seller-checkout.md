# Make multi-seller Checkout an atomic purchase boundary

**Status**: accepted

Checkout is a single idempotent, all-or-nothing boundary over the selected Cart entries. It revalidates the current Listing contracts, atomically consumes selected entries, creates one Order per Seller with independent OrderItems and EscrowHolds, and records one aggregate `PURCHASE_HOLD`; a failed validation, required contract confirmation, concurrency check, or fund movement leaves the Cart unchanged and creates no Orders, holds, or buyer-fund movement. We chose this over partial checkout or independent per-Seller commits because a Buyer must authorize the mixed cart as one payment, while per-item holds and OrderItems preserve independent fulfillment, Dispute, refund, and release outcomes afterward.
