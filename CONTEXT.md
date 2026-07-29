# Avin Ubiquitous Language & Domain Model

This document serves as the canonical glossary and domain model for the **Avin** digital services & courses marketplace. All developers, documentation, code symbols, and specs must strictly use the terms defined here.

---

## 1. Core Entities

### Admin

An authorized Avin platform operator responsible for marketplace governance, including reviewing `SellerApplication`s, mediating `Dispute`s, enforcing Seller policy, and approving SellerWallet withdrawals. An `Admin` is distinct from both a `User` (buyer) and a `Seller` (merchant).

### User (Buyer)

An authenticated account representing a buyer on the marketplace. Every `User` is implicitly a buyer and possesses a `UserWallet`. Under Avin's architecture, `User` and `Seller` are strictly separate entities requiring distinct accounts and logins.

### Seller

An authenticated entity representing an independent seller/merchant on the marketplace. A `Seller` manages their store profile, publishes `Listing`s, fulfills `Order`s, and maintains a `SellerWallet`. Its public profile exposes only storefront name, avatar, optional bio, joined month/year, average rating and rating count, and completed-order count; bank and verification data remain private.

### SellerApplication

The onboarding record through which a prospective `Seller` supplies their verified phone number, bank account, and acceptance of the versioned Seller Agreement for manual Admin review. Its lifecycle is `PENDING_REVIEW` → `APPROVED`, `CHANGES_REQUESTED`, or `REJECTED`. An Admin must give a reason for `CHANGES_REQUESTED` and `REJECTED`; a Seller may revise and resubmit a `CHANGES_REQUESTED` application. `REJECTED` is reserved for fraud, policy violations, or a definitive ban. Before approval, the prospective Seller may create a private draft storefront but cannot publish Listings, sell, or withdraw funds.

### Seller Agreement

A versioned agreement that a prospective or active `Seller` must accept. It records the accepted version and timestamp, and explicitly discloses platform commission and withdrawal rules. A material revision requires re-acceptance before the Seller can publish further Listings.

### Seller Enforcement

An Admin may place a `Seller` in one of two enforcement states. `SUSPENDED` Sellers have their Listings hidden and cannot accept new sales or request withdrawals, but retain access to active Orders and buyer chat so fulfillment or Disputes can be resolved. `BANNED` Sellers permanently lose Seller access; Avin cancels and refunds affected unfulfilled OrderItems, freezes payout pending Admin review, and provides a documented appeal route.

### Listing

The canonical published offering created by a `Seller` for purchase on the marketplace. A `Listing` belongs strictly to **one `Category`** (sub-category). Types of `Listing`:

- **`SERVICE`**: Manual digital service requiring buyer-submitted inputs and seller manual delivery/fulfillment (e.g., account unlock, custom setup).
- **`COURSE`**: Educational or digital asset package whose content is managed outside Avin by the `Seller`. The `Seller` manually delivers the buyer's access through the `Order` fulfillment flow; Avin does not host course content or manage enrollment.

In P0, Listings are published immediately and reviewed through a single global post-moderation policy; Sub-Categories do not override this policy.

### Category

A 2-level, Admin-managed hierarchical taxonomy (Parent Category $\rightarrow$ Sub-Category) used to organize `Listing`s across the marketplace. Sellers select an existing Sub-Category; they cannot create or change the taxonomy in P0.

Each `Category` has an Admin-configured platform commission rate and may define reusable default `ServiceInputField` and `WarrantyPolicy` templates. These templates pre-populate a `Listing`; the Listing's finalized fields and warranty remain authoritative. An Admin sets the permitted warranty bounds per Sub-Category, and the final values are snapshotted on the `OrderItem` at purchase time.

### Order

A commercial agreement between exactly **one `User` (Buyer)** and **one `Seller`** for the purchase of one or more line items (`OrderItem`s) from that seller's listings.

- Multi-seller carts automatically split into **per-seller `Order`s** at checkout (1 Order = 1 Seller).
- An `Order` is a container and its displayed progress is derived from its `OrderItem`s; it has no independent fulfillment state machine.
- Each `Order` has a real-time chat channel and contains the `EscrowHold`s and `Dispute`s for its items.

### OrderItem

A line item within an `Order`, capturing the snapshotted `Listing`, quantity, unit price, and buyer-provided inputs at the time of purchase. Each `OrderItem` owns its fulfillment lifecycle, `EscrowHold` allocation, warranty period, and dispute outcome.

### UserWallet

The financial account belonging to a `User`. Used to hold deposits of at least `5,000 VND` (via bank transfer VietQR/payOS/SePay) and pay for purchases. P0 imposes no Avin-specific maximum deposit beyond bank or payment-provider limits.

- **Available Balance**: Deposited funds that the `User` can spend on a new purchase.
- **Held Balance**: Funds committed to an active `EscrowHold`; visible to the `User` but unavailable for another purchase.

### SellerWallet

The financial account belonging to a `Seller`. Tracks:

- **Pending Escrow Balance**: Funds locked in active orders pending completion and warranty expiration.
- **Available Balance**: Earned revenue cleared for bank payout withdrawal.

In P0, a `Seller` requests withdrawal of at least `5,000 VND` from Available Balance to their verified bank account; an Admin approves and pays the request manually.

### EscrowHold

A financial hold entity tied 1-to-1 with an `OrderItem`. Holds the item's buyer payment in escrow during fulfillment and warranty before releasing funds to `SellerWallet` (minus platform commission) or refunding `UserWallet`. It is created atomically with moving the matching amount from `UserWallet` Available Balance to Held Balance.

### Transaction

An immutable financial ledger entry recording every monetary event (`DEPOSIT`, `PURCHASE_HOLD`, `ESCROW_RELEASE`, `PLATFORM_COMMISSION`, `REFUND`, `WITHDRAWAL_REQUEST`, `WITHDRAWAL_PAID`). A deposit is credited only after an idempotent, verified payment-provider webhook; its provider transaction ID uniquely identifies the credit.

### Dispute

An entity initiated by a `User` when an `OrderItem` cannot be resolved directly with the `Seller`. It suspends that item's `EscrowHold` release and escalates the item to platform Admin mediation. In P0, mediation results in either a full refund to the `User` or full escrow release to the `Seller`; partial refunds are out of scope.

### Review

A rating (1–5 stars) and feedback comment submitted by a `User` for a completed `OrderItem`.

### Message

A durable, append-only message exchanged within an `Order`'s dedicated chat channel. A `User` and `Seller` may send Messages throughout the Order; an Admin may send a visibly attributed mediation Message only while a `Dispute` is open. Every Message is permanently stored as part of the order history and delivered live to participants; real-time delivery events are not the source of truth. Participants cannot edit or delete a sent Message; an Admin may redact it from normal views while preserving the original for audit and dispute review. Admin access to the chat is audited.

### OrderFile

A private, immutable file shared as a chat attachment or fulfillment deliverable within an `Order`. Access is limited to that Order's `User`, `Seller`, and an authorized Admin. A submitted file cannot be overwritten or deleted by a participant; an Admin may quarantine or redact it from normal views while preserving the original and its audit trail.

### DisputeEvidence

A private, immutable file submitted as evidence for a `Dispute`. Access is limited to the Dispute's parties and an authorized Admin. Submitted evidence cannot be overwritten or deleted by a participant; an Admin may quarantine or redact it from normal views while preserving the original and its audit trail.

### Notification

An in-app or system alert sent to a `User` or `Seller` triggered by lifecycle events.

---

## 2. Value Objects

### Money / Price

An immutable value object representing monetary value in Vietnamese Đồng (`amount: integer`, `currency: 'VND'`).

### WarrantyPolicy

An immutable snapshot embedded on a `Listing` and copied to each `OrderItem` at purchase time (`durationHours: number`, `terms: string`). Defines the warranty protection period during which the item's funds remain in escrow.

### ServiceInputField

An embedded definition schema on a `Listing` specifying required custom inputs from the buyer (e.g., `[{ key: 'profile_link', label: 'Link Profile', type: 'text', required: true }]`).

### OrderCustomInput

A key-value snapshot of the buyer's submitted form responses attached to an `OrderItem`.

---

## 3. Aggregate Boundaries

1. **`UserAggregate`**: `User` + `UserWallet`
2. **`SellerAggregate`**: `Seller` + `SellerWallet` + Bank Details
3. **`ListingAggregate`**: `Listing` + `Category` + `ServiceInputField` definitions + `WarrantyPolicy`
4. **`OrderAggregate`**: `Order` + `OrderItem`s + `OrderCustomInput` + per-item `EscrowHold`s + `OrderChat` (Messages)
5. **`DisputeAggregate`**: `Dispute` + `DisputeEvidence`

---

## 4. Key Relationship Cardinalities

- **`User` $\leftrightarrow$ `Seller`**: Strictly 1-to-0 (Separate accounts and login credentials).
- **`Listing` $\rightarrow$ `Category`**: Many-to-1 (Strictly single sub-category per listing).
- **`Order` $\rightarrow$ `Seller`**: Many-to-1 (1 Order = 1 Seller strictly).
- **`Order` $\rightarrow$ `User`**: Many-to-1.
- **`OrderItem` $\rightarrow$ `EscrowHold`**: 1-to-1.
- **`OrderItem` $\rightarrow$ `Dispute`**: 1-to-0..1.
