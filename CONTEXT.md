# Avin Ubiquitous Language & Domain Model

This document serves as the canonical glossary and domain model for the **Avin** digital services & courses marketplace. All developers, documentation, code symbols, and specs must strictly use the terms defined here.

---

## 1. Core Entities

### Admin

An authorized Avin platform operator responsible for marketplace governance, including reviewing `SellerApplication`s, mediating `Dispute`s, enforcing Seller policy, and approving SellerWallet withdrawals. An `Admin` is distinct from both a `User` (buyer) and a `Seller` (merchant).

### User (Buyer)

An authenticated account representing a buyer on the marketplace. Every `User` is implicitly a buyer and possesses a `UserWallet`. Under Avin's architecture, `User` and `Seller` are strictly separate entities requiring distinct accounts and logins.

### Seller

An authenticated entity representing an independent seller/merchant on the marketplace. A `Seller` manages their store profile, publishes `Listing`s, fulfills `Order`s, and maintains a `SellerWallet`. Its public profile exposes only storefront name, avatar, Store description, joined month/year, average rating and rating count, and completed-order count; bank and verification data remain private.

### Store profile

The Seller-controlled identity and presentation of a storefront: its display name, public address, description, and visual identity. A complete profile requires a display name, Store slug, Store description, and Store avatar; the banner is optional. For an approved, non-enforced Seller, a complete profile becomes publicly visible even when the Store has no Listing; an incomplete draft, preview, or an unapproved or enforced Seller's profile remains private. No separate Store-opening confirmation is required.

### Store slug

The globally unique, lowercase, URL-safe public address of a Store profile. A new Store profile receives an initial slug derived from its name; a Seller may change it while the Store profile remains private and has never been public, and the address must pass validation before it is saved. Once the Store first becomes public, the slug is locked permanently so temporary enforcement cannot break shared URLs.

### Store media

Images that establish a Store profile's visual identity. An avatar is required when saving a Store profile; a banner is optional. A Seller may keep the banner empty while the profile remains private.

### Store avatar

The primary square image representing a Store profile. Existing product language may call the same asset the Seller's logo.

### Store description

The short public explanation of what a Seller offers, who it serves, and what Buyers can expect. It is a required part of a complete Store profile.

### Store status

The Store's derived public availability state. A Store profile remains `Nháp` while the Seller is not approved, is enforced, or its required fields are incomplete, and becomes publicly available once the Seller is approved, non-enforced, and the fields are complete, regardless of the number or status of its Listings. It becomes public again automatically when enforcement is lifted while the other conditions remain true. Publishing a Listing is independent of Store profile visibility; an empty public Store is valid.

### Store preview

A Seller-only rendering of a Store profile used to inspect its saved public presentation before sharing it with Buyers. A preview is an optional utility and does not change Store visibility.

### SellerApplication

The onboarding record through which a prospective `Seller` supplies their verified phone number, bank account, and acceptance of the versioned Seller Agreement for manual Admin review. Its lifecycle is `PENDING_REVIEW` → `APPROVED`, `CHANGES_REQUESTED`, or `REJECTED`. An Admin must give a reason for `CHANGES_REQUESTED` and `REJECTED`; a Seller may revise and resubmit a `CHANGES_REQUESTED` application. `REJECTED` is reserved for fraud, policy violations, or a definitive ban. Before approval, the prospective Seller may create a private draft storefront but cannot publish Listings, sell, or withdraw funds.

### Seller Agreement

A versioned agreement that a prospective or active `Seller` must accept. It records the accepted version and timestamp, and explicitly discloses platform commission and withdrawal rules. A material revision requires re-acceptance before the Seller can publish further Listings.

### Seller Enforcement

An Admin may place a `Seller` in one of two enforcement states. `SUSPENDED` Sellers have their Store profile and Listings hidden and cannot accept new sales, request withdrawals, or manage Listings, but retain access to active Orders and buyer chat so existing OrderItems can be fulfilled or disputed. `BANNED` Sellers permanently lose Seller access and have their Store profile hidden; Avin cancels and refunds affected unfulfilled OrderItems, freezes payout pending Admin review, and provides a documented appeal route, while already-delivered items continue through Buyer review, Warranty, and Dispute handling.

### Listing

The canonical offering created by a `Seller` for purchase on the marketplace. A `Listing` belongs strictly to **one `Category`** (sub-category). A Seller may create or save a `DRAFT` Listing before completing the Store profile, but publishing an eligible Listing requires a complete Store profile. Once published, the Listing's visibility is independent of how many other Listings the Store has. Types of `Listing`:

- **`SERVICE`**: Manual digital service requiring buyer-submitted inputs and seller manual delivery/fulfillment (e.g., account unlock, custom setup).
- **`COURSE`**: Educational or digital asset package whose content is managed outside Avin by the `Seller`. The `Seller` manually delivers the buyer's access through the `Order` fulfillment flow; Avin does not host course content or manage enrollment.

In P0, Listings are published immediately and reviewed through a single global post-moderation policy; Sub-Categories do not override this policy. A draft requires an owner, type, and one active Sub-Category but may otherwise be incomplete. Publishing or resuming validates the complete public contract: title, description, immutable slug, fixed VND price, Processing Expectation, primary image, WarrantyPolicy within Category bounds, and valid ServiceInputFields. Each Listing has an immutable, globally unique public slug, distinct from its internal identity. A Listing has one required positive integer VND price, with no price ranges, variants, discounts, quantity rules, inventory, or automatic delivery. Publishing requires at least one image, including a designated primary image; other media types are out of scope. Each Listing has a required Processing Expectation displayed to Buyers and snapshotted on its OrderItems at purchase. An eligible Seller may edit a `DRAFT`, `PAUSED`, `PUBLISHED`, or `HIDDEN` Listing; edits to a published Listing immediately affect future Buyers, while a hidden Listing remains hidden until an Admin restores it. Non-public Listings are accessible only to their owner and authorized Admins, never to Buyers or other Sellers. A Listing is `DRAFT`, `PUBLISHED`, `PAUSED`, `HIDDEN`, or `ARCHIVED`: Sellers control `PAUSED`, Admins control `HIDDEN`, and `ARCHIVED` is terminal. A Seller may publish a draft, pause or archive any of their non-archived Listings, and resume a paused Listing. An Admin may hide a published Listing, restore a hidden Listing only when its publication gates pass, and archive any non-archived Listing. Draft Listings that have never entered the public lifecycle may be hard-deleted by their owner; public-lifecycle Listings are never hard-deleted, and archival preserves their moderation audit and historical media references. An unavailable Listing cannot be newly purchased: a Cart retains it as unavailable and blocks checkout until the Buyer removes it, while completed OrderItems retain their Listing snapshots. Admin moderation actions require a reason and create an audit record containing the Listing, action, actor, timestamp, reason, and prior/new visibility state. Every transition into `PUBLISHED`—Seller publish, Seller resume, or Admin restore—requires a complete Store profile, an approved non-enforced Seller, and acceptance of the current Seller Agreement; Listing creation and management require the Seller to be approved and non-enforced.

### Category

A 2-level, Admin-managed hierarchical taxonomy (Parent Category $\rightarrow$ Sub-Category) used to organize `Listing`s across the marketplace. Sellers select an existing Sub-Category; they cannot create or change the taxonomy in P0.

- **Lifecycle & Visibility**: Categories exist in `ACTIVE`, `HIDDEN`, or `ARCHIVED` (terminal) status. Hiding or archiving a Parent Category automatically cascades to all its Sub-Categories. A Listing may be created, moved, published, or resumed only in an `ACTIVE` Sub-Category. Listings linked to a hidden or archived Category are suppressed from all public discovery and detail views without changing their own Listing status.
- **Ordering**: Both Parent Categories and Sub-Categories support an explicit `sortOrder` for display positioning.
- **Slugs**: Parent Category slugs are globally unique. Sub-Category slugs are unique within their parent (`UNIQUE(parent_id, slug)`). Slugs are auto-generated from name and editable on creation, but immutable once created.
- **Commercial & Templates**: Each **Sub-Category** holds an Admin-configured `commissionRatePercent`, reusable default `ServiceInputField` and `WarrantyPolicy` templates, and `WarrantyBounds` (min/max duration in hours). Its templates initialize a new Listing, which may tailor its own fields and policy; its warranty duration must remain within the selected Sub-Category’s bounds. Parent Categories are purely organizational and do not store commission rates.
- **Deletion**: An Admin may hard-delete a Category only if zero `Listing`s are linked to it; otherwise, the Category must be `ARCHIVED`.

### Cart

A persistent collection of a `User`'s intended purchases, which may contain `Listing`s from multiple `Seller`s. It contains at most one entry per Listing, with one unit per Listing in P0. An unavailable Listing remains in the Cart and blocks `Checkout` only while selected, until the User removes or deselects it. A successful Checkout removes its selected entries; the Cart is not a commercial agreement and becomes `Order`s only through checkout.

### Checkout

The all-or-nothing purchase operation that converts the selected eligible entries of a `Cart` into one `Order` per `Seller`, one `OrderItem` per Listing, and one `EscrowHold` per OrderItem. Checkout revalidates that every selected Listing and its Category are currently available, then uses the current Listing contract and current commission rate from its Sub-Category at purchase time rather than a Cart-time quote. The Buyer pays the sum of the current integer VND prices for the selected Listings; P0 adds no shipping, discount, buyer fee, or quantity multiplier. If the final price or any material Listing contract value—WarrantyPolicy, Processing Expectation, or ServiceInputFields—differs from what the Buyer reviewed, Checkout stops and requires explicit confirmation of the new contract before any money moves. It requires sufficient `UserWallet` Available Balance; Held Balance cannot fund a purchase. Concurrent Checkouts competing for the same Available Balance are resolved so that at most one can commit the contested funds, with no negative balance or duplicate hold. Selected Cart entries are consumed atomically, so competing Checkout requests cannot create duplicate purchases from the same entries. Repeating the same Checkout request returns its original outcome and never creates duplicate Orders, EscrowHolds, or Transactions. A deterministic business failure leaves the Cart unchanged and allows a new Checkout attempt after the Buyer fixes the cause. The Buyer supplies required `ServiceInputField` values during Checkout; missing required values, invalid types, or undeclared fields reject the Checkout before money moves, and a successful Checkout snapshots the Listing contract, commission rate, and valid values as part of each `OrderItem` and its `OrderCustomInput`s. A multi-item Checkout creates one aggregate `PURCHASE_HOLD` Transaction for wallet history while retaining one independent EscrowHold per OrderItem. Unselected Cart entries remain in the Cart. If any selected part cannot be completed, no Order, OrderItem, EscrowHold, or buyer-fund movement is committed.

### Order

A commercial agreement between exactly **one `User` (Buyer)** and **one `Seller`** for the purchase of one or more line items (`OrderItem`s) from that seller's listings.

- Multi-seller carts automatically split into **per-seller `Order`s** at checkout (1 Order = 1 Seller).
- An `Order` is a container and its displayed progress is derived from its `OrderItem`s; it has no independent fulfillment state machine. Each OrderItem proceeds independently, so a failure, dispute, or refund for one item does not cancel or settle the other items.
- Each `Order` has a real-time chat channel and contains the `EscrowHold`s and `Dispute`s for its items.
- Each Seller can access only their own Order and OrderItems, including only the Buyer inputs needed for those items; Sellers cannot see other Sellers' Orders or the Buyer's combined Cart.

### OrderItem

A line item within an `Order`, capturing the snapshotted `Listing`, quantity, unit price, commission rate, WarrantyPolicy, Processing Expectation, and buyer-provided inputs at the time of purchase. In P0, each OrderItem represents one purchased Listing with quantity one. Each `OrderItem` owns its fulfillment lifecycle, `EscrowHold` allocation, warranty period, and dispute outcome; Seller fulfillment reaches `DELIVERED`, then Buyer confirmation or the deterministic 48-hour buyer-review timeout moves it into `IN_WARRANTY`. If Seller has not delivered by the Processing Expectation deadline, the Buyer may open a late-delivery Dispute. The Buyer may cancel only while the item is `AWAITING_SELLER`, receiving a full refund and closing its EscrowHold; once work begins, problems use the Dispute path. The Seller may cancel before delivery only with a recorded reason, which fully refunds that item and closes its EscrowHold without affecting other items.

### UserWallet

The financial account belonging to a `User`. Used to hold deposits of at least `5,000 VND` through an embedded VietQR bank-transfer flow monitored by SePay, and to pay for purchases. P0 imposes no Avin-specific maximum deposit beyond bank or payment-provider limits.

- **Available Balance**: Deposited funds that the `User` can spend on a new purchase.
- **Held Balance**: Funds committed to an active `EscrowHold`; visible to the `User` but unavailable for another purchase.

The balances are the current summary of the UserWallet and must always reconcile with the immutable `Posting`s in its `LedgerAccount`s.

The User-facing wallet history contains only monetary events that actually occurred. An uncredited or abandoned `Deposit request` is not a Transaction and does not appear in that history.

### Deposit request

A `User`'s one-time intent to add a specified integer VND amount to their `UserWallet` through a VietQR transfer displayed inside Avin and monitored by SePay. P0 transfers all use one Avin receiving bank account, while each explicit creation receives a new payment reference consisting of the `AV` prefix plus 12 random uppercase letters or digits, embedded with the exact amount in the transfer instruction. The reference is unique and contains neither an internal identifier nor User information. A request is `PENDING` until it is credited exactly once, after which it is `CREDITED`; it has no expired, cancelled, or abandoned financial state. Leaving the deposit flow abandons only the user interface and does not cancel the request. A later valid notification still credits the request exactly once even after the User has left the flow, so multiple pending requests may coexist. Pending requests remain available to Admins for investigation but do not appear in the User-facing wallet history.

### Deposit reconciliation

An Admin review of a SePay payment notification whose reference, currency, or amount cannot be matched exactly to a `Deposit request`, including a second distinct payment for a request that has already been credited. Reconciliation may associate the payment only with an existing Deposit request, never directly with an arbitrarily selected User; no `UserWallet` credit exists until the association is confirmed. A confirmed reconciliation credits the exact amount SePay reports as received, rather than the amount originally requested. A payment that cannot be associated with any request remains unresolved for support or external refund handling.

### SellerWallet

The financial account belonging to a `Seller`. Tracks:

- **Pending Escrow Balance**: Funds locked in active orders pending completion and warranty expiration.
- **Available Balance**: Earned revenue cleared for bank payout withdrawal.

At Checkout, each active `EscrowHold` contributes to Pending Escrow Balance, which the Seller cannot spend or withdraw. When that hold is released, Pending decreases and Available increases by the amount after commission; a refund decreases Pending without crediting the Seller. In P0, a `Seller` requests withdrawal of at least `5,000 VND` from Available Balance to their verified bank account; an Admin approves and pays the request manually.

### EscrowHold

A financial hold entity tied 1-to-1 with an `OrderItem`. Holds the item's full buyer payment in escrow during fulfillment and warranty before independently releasing funds to `SellerWallet` after that item's Warranty expiry (minus platform commission) or refunding `UserWallet`; platform commission is recognized only at release and is rounded down to an integer VND amount. An open `Dispute` blocks release until Admin resolution. It is created atomically with moving the matching amount from `UserWallet` Available Balance to Held Balance. A release records one atomic Transaction for the OrderItem containing both the Seller proceeds and platform commission postings. `RELEASED`, `REFUNDED`, and `CANCELLED` are terminal outcomes; an EscrowHold is never reopened.

### LedgerAccount

An account in Avin's financial ledger representing where monetary value is held or owed, including platform bank clearing, UserWallet Available and Held balances, SellerWallet Pending and Available balances, escrow, and platform commission.

### Posting

An immutable debit or credit applied to one `LedgerAccount` as part of a `Transaction`. Every Transaction has at least two Postings whose debits and credits balance exactly.

### Transaction

An immutable, authoritative financial event composed of balanced `Posting`s. Participant-facing wallet history exposes one meaningful item per monetary event (`DEPOSIT`, `PURCHASE_HOLD`, `ESCROW_RELEASE`, `REFUND`, `WITHDRAWAL_REQUEST`, `WITHDRAWAL_PAID`, `REVERSAL`); `PLATFORM_COMMISSION` is represented by postings in an `ESCROW_RELEASE` Transaction rather than a separate participant-facing event. A multi-item Checkout has one aggregate `PURCHASE_HOLD`; each OrderItem's EscrowHold resolution has one atomic release or refund Transaction. A deposit is credited only after an idempotent, verified payment-provider notification; its provider transaction ID uniquely identifies the credit, so a retried notification cannot create money twice. One `Deposit request` may be credited automatically at most once; any later payment with a distinct provider transaction ID requires `Deposit reconciliation`. A financial correction never edits or deletes history: a REVERSAL Transaction links to and posts the exact inverse of the original Transaction before any corrected Transaction is appended. An automated reversal cannot make a wallet balance negative; an insufficient-balance correction requires separate operational handling.

### Dispute

An entity initiated by a `User` when an `OrderItem` cannot be resolved directly with the `Seller` during the 48-hour delivery review, after a missed Processing Expectation deadline, or during the `IN_WARRANTY` period. It suspends that item's `EscrowHold` release and escalates the item to platform Admin mediation; a late delivery does not automatically close the Dispute. In P0, mediation has exactly one auditable outcome: either a full refund to the `User` or full escrow release to the `Seller`; partial refunds and repeated resolution are out of scope.

### Review

A rating (1–5 stars) and feedback comment submitted by a `User` for a completed `OrderItem`.

### Message

A durable, append-only message exchanged within an `Order`'s dedicated chat channel. A `User` and `Seller` may send Messages throughout the Order; an Admin may send a visibly attributed mediation Message only while a `Dispute` is open. Every Message is permanently stored as part of the order history and delivered live to participants; real-time delivery events are not the source of truth. Participants cannot edit or delete a sent Message; an Admin may redact it from normal views while preserving the original for audit and dispute review. Admin access to the chat is audited.

### OrderFile

A private, immutable file shared as a chat attachment, buyer input, or fulfillment deliverable within an `Order`. Access is limited to that Order's `User`, `Seller`, and an authorized Admin. A submitted file cannot be overwritten or deleted by a participant; an Admin may quarantine or redact it from normal views while preserving the original and its audit trail.

### DisputeEvidence

A private, immutable file submitted as evidence for a `Dispute`. Access is limited to the Dispute's parties and an authorized Admin. Submitted evidence cannot be overwritten or deleted by a participant; an Admin may quarantine or redact it from normal views while preserving the original and its audit trail.

### Notification

An in-app or system alert sent to a `User` or `Seller` triggered by lifecycle events.

---

## 2. Value Objects

### Money / Price

An immutable value object representing monetary value in Vietnamese Đồng (`amount: integer`, `currency: 'VND'`).

### Processing Expectation

A positive whole-number estimate, in hours, of the time a Seller expects to need before fulfillment. It is displayed on a Listing and snapshotted on each purchased OrderItem; its deadline begins at successful Checkout.

### WarrantyPolicy

An immutable snapshot embedded on a `Listing` and copied to each `OrderItem` at purchase time (`durationHours: number`, `terms: string`). Defines the warranty protection period during which the item's funds remain in escrow; the period begins when Buyer confirmation or the deterministic buyer-review timeout moves the delivered item into `IN_WARRANTY`.

### ServiceInputField

An embedded definition schema on a `Listing` specifying required custom inputs from the buyer (e.g., `[{ key: 'profile_link', label: 'Link Profile', type: 'text', required: true }]`). Field keys are unique within a Listing.

### Listing Media

An image attached to a Listing. It is visible to its Seller and Admin while private, and to Buyers only while the Listing and its Category are publicly available.

### OrderCustomInput

A key-value snapshot of the buyer's submitted form responses attached to an `OrderItem`; file values reference private `OrderFile`s within that Order.

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
