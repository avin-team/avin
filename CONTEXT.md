# Avin Ubiquitous Language & Domain Model

This document serves as the canonical glossary and domain model for the **Avin** digital services & courses marketplace. All developers, documentation, code symbols, and specs must strictly use the terms defined here.

---

## 1. Core Entities

### Admin

An authorized Avin platform operator, presented as **Quản lý hệ thống** on Avin Check surfaces, responsible for marketplace and protection governance. An `Admin` is distinct from a `User`, `Seller`, and `Protection Provider`; the public label **Đối tác Avin** never grants this authorization role.

### Operations console

An Admin-only workspace that brings together role-protected views of marketplace risk, money, and audit state across existing domain contexts. It coordinates those views but does not own `SellerApplication`, `Listing`, `Dispute`, `Wallet`, or `Seller Enforcement` decisions. Its P0 surfaces are deposit reconciliation, read-only `Transaction` exploration, generic audit history, and email-delivery health; these surfaces use domain-specific filters and cursor pagination. Reconciliation and email retry invoke existing authorized domain commands, while transaction and audit history remain read-only. Sensitive Admin reads—full bank or KYC details, `DisputeEvidence`, Order Chat, financial detail, and email retry—are audited with actor, target, purpose, and outcome; ordinary lists and aggregates are not audited individually.

### User (Buyer)

An authenticated account representing a buyer on the marketplace. Every `User` is implicitly a buyer and possesses a `UserWallet`; it may also own a Protection Provider Application without changing its Buyer role. Under Avin's architecture, `User` and `Seller` remain separate entities requiring distinct accounts and logins.

### Seller

An authenticated entity representing an independent seller/merchant on the marketplace. A `Seller` manages their store profile, Listings, Orders, and `SellerWallet`, and may also own a Protection Provider Application without changing its Seller role. Its marketplace profile and Provider standing remain distinct.

### Avin Check

The public Avin module for verified Provider discovery, external identifier lookup, moderated transaction warnings, and manually administered protection records. It shares Avin applications and infrastructure while remaining distinct from marketplace commerce.

### Provider Directory

The public list of active Protection Providers, ordered by Provider Tier from `VIP` through `NORMAL`, then by recognized Provider Bond descending, verification recency, and display name. Each card shows the Provider's avatar, name, tier presentation, exact Bond, Recommended Transaction Limit, summarized services, Zalo/Facebook channels, and verification date; full Registered Bank Accounts remain on the profile detail. A specific search ranks identity relevance instead of forcing tier order: it supports exact normalized lookup by bank account number, optional phone/Zalo, and social username or URL, plus fuzzy lookup by display name, verified legal name, and registered service. CCCD values are never searchable. _Avoid_: paid placement, trust leaderboard.

### Protection Provider

A person or business accepted into Avin Check, whether their owning account is a Buyer or Seller, and presented publicly as a **Đối tác Avin**. Its Provider profile neither reveals nor automatically links its marketplace role or Store; a Protection Provider is not an `Admin` and cannot delegate its verified standing. _Avoid in code_: Admin, guaranteed Seller, protected Seller, GDV network owner.

### Protection Provider Application

An evidence-backed, year-round request owned by an active, non-locked Buyer or Seller account to become a Protection Provider. A complete application enters review only after its Provider Deposit Intent is matched, then is reviewed as `PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, or `REJECTED` with an explicit reason. Missing or correctable information uses `CHANGES_REQUESTED` and may be revised on the same application; `REJECTED` is terminal and reserved for fraud, impersonation, or a definitive policy prohibition. Seller approval is not a prerequisite, but confirmed marketplace fraud blocks a new application, and the same verified person or business cannot acquire a second Provider standing through another account. Avin does not classify applicants as individuals or businesses in a separate lifecycle; an Admin verifies the declared legal identity, CCCD, and Registered Bank Accounts. Creating the transfer instruction and submitting the application require the owner to complete 2FA and separately acknowledge that the exact Bond and full Registered Bank Account numbers will become public after approval. Once the first transfer is matched, the Bond amount is fixed throughout review: no additional application deposit or decrease is permitted, and a later increase uses Provider Bond Top-up after approval. Approval is one atomic operation that verifies the matched Bond has not entered refund, consumes it into the active standing, and creates the Protection Provider, its Bond record, and first Provider Profile Version; a concurrent refund committed first makes approval fail.

### Provider CCCD

The applicant's required 12-digit citizen identity number used privately by an Admin to verify identity and prevent duplicate Provider standing. Avin accepts the number as text and never collects a front or back card image; the full value is encrypted while the application remains editable or under review and is excluded from public profiles, public list views, search indexes, logs, and notification payloads. A duplicate keyed hash blocks submission with a neutral message and may be relinked by a `SUPER_ADMIN` only after proving the same identity. After approval or rejection, Avin deletes the full value and retains only the keyed hash, last four digits, verifier, and verification time; even the last four digits remain Admin-only. _Avoid_: identity image, public identifier, generic evidence reference.

### Protection Provider Workspace

The Provider's private area, entered through its owning Buyer or Seller account, for reading the exact profile and status held by Avin and requesting a profile revision or Bond Withdrawal. Reading and saving drafts use the normal authenticated session, while submitting a profile revision or Bond Withdrawal requires 2FA. It cannot directly publish verified information, alter the recognized Provider Bond, or move money. _Avoid_: Provider admin panel, wallet.

### Provider Owner Account

The existing Buyer or Seller account that owns a Protection Provider Application and enters the Protection Provider Workspace after approval. A security lock blocks workspace access without changing Provider standing, and the account cannot be hard-deleted while retained Provider records depend on it. Account recovery is preferred when access is lost; an Admin may relink ownership to another Buyer or Seller account only after proving it represents the same verified person or business, recording an immutable audit trail, and never transferring the Provider standing to a different identity. _Avoid_: Provider Account, `PROVIDER` role, separate Provider login.

### Protection Program Policy

The versioned terms governing Provider eligibility, the currently applicable Membership Fee, minimum Provider Bond, Provider Tier thresholds, Recommended Transaction Limit ratio and rounding, support rules, and withdrawal conditions. A Provider Deposit Intent snapshots the current policy, and successful payment matching binds the resulting application, Bond, tier, and limit to that policy version so a later policy change cannot retrospectively change a standing still under review. Material changes require existing Providers to re-accept by a stated deadline or become suspended; editorial changes do not.

### Provider Deposit Intent

A one-time instruction for an applicant to transfer a chosen Provider Bond amount of at least 1,000,000 VND to Avin using a unique payment reference. An application has at most one active intent, which expires after 24 hours and may be replaced before receiving money. Exact amount and reference matches are recognized automatically; late, partial, excess, or split transfers enter manual reconciliation available only to a `SUPER_ADMIN`, who may link multiple source transactions and recognize their actual total when it meets the minimum. A matched Provider Deposit Intent gates entry into application review and remains separate from UserWallet deposits and marketplace Transactions. _Avoid_: wallet deposit, membership payment, application fee.

### Provider Bond

Provider-owned money transferred to a dedicated Avin Check custody bank account and recognized after its Provider Deposit Intent is matched. Its exact recognized amount is public on the Provider profile and determines the Provider Tier and maximum Recommended Transaction Limit. It remains separate from Avin's marketplace payment flows and is neither an Avin wallet balance nor an `EscrowHold` tied to an `OrderItem`. _Avoid_: wallet balance, escrow, insurance fund.

### Provider Tier

The public presentation level derived from a Protection Provider's confirmed Provider Bond, never assigned independently by an Admin. `NORMAL` applies from 1,000,000 VND to below 5,000,000 VND and has no decorative frame; `BRONZE`, `SILVER`, `GOLD`, `DIAMOND`, and `VIP` begin at 5,000,000, 10,000,000, 20,000,000, 50,000,000, and 100,000,000 VND respectively. Top-ups and decreases recalculate the tier automatically; falling below 1,000,000 VND suspends the Provider pending review. _Avoid_: trust score, Royal, manually assigned rank.

### Bond Adjustment

An immutable record that changes Avin's recognized `Provider Bond` amount after a matched deposit, withdrawal, support payment, refund, or correction. SePay creates exact-match increases automatically; only a `SUPER_ADMIN` may reconcile a mismatch, issue a refund, or record a manual adjustment, and every manual action records its reason and external evidence without dual approval. Any applied change publishes a new Provider Profile Version containing the resulting Bond, Provider Tier, and Recommended Transaction Limit. _Avoid_: wallet transaction, unreviewed manual mutation.

### Application Bond Refund

The full return of matched Provider Bond when a Provider Application is terminally rejected or its owner abandons the application. `CHANGES_REQUESTED` retains the Bond for resubmission; a paid application becomes abandoned after 30 days without owner activity following its final reminder. An Application Bond Refund moves through `REFUND_PENDING` to `REFUNDED`, has a three-business-day operating target, and is executed only by a `SUPER_ADMIN` without dual approval. It returns to the verified source account when available, otherwise the Primary Bank Account; exceptions enter manual review, and completion records the external bank reference. _Avoid_: wallet refund, rejection fee, partial forfeiture.

### Bond Withdrawal

An off-platform Provider request, recorded by an Admin, to leave the program and recover the remaining Provider Bond after a 30-day cooling period, open Support Reviews, and valid Bond Adjustments are resolved. P0 has no voluntary partial withdrawal: a Provider may top up or request full exit only; a decrease while remaining active can result solely from support, refund, or a `SUPER_ADMIN` correction. The remaining Bond is fully returnable; the separate Membership Fee is not. _Avoid_: partial cash-out, wallet withdrawal, early-exit forfeiture.

### Provider Bond Top-up

A 2FA-authorized, 24-hour VietQR/SePay intent created by an active Protection Provider to add a chosen amount to its recognized Bond. It uses the same dedicated Avin Check custody and exact-match rules as the application deposit, snapshots the current Protection Program Policy, and remains separate from UserWallet. An exact match atomically increases Bond and publishes a new Provider Profile Version with the derived tier and limit without repeating identity review; late, partial, excess, or split payments require `SUPER_ADMIN` reconciliation. _Avoid_: application amendment, wallet deposit, manual tier upgrade.

### Membership Fee

A policy-configured charge concept for participation or verification in the protection program, separate from the refundable `Provider Bond`. P0 fixes it at zero and neither Provider Deposit Intent nor Provider Bond Top-up collects it; enabling a non-zero fee requires an explicit future collection and refund decision instead of silently adding it to Bond transfers. _Avoid_: bond fee, protection balance, latent payment split.

### Recommended Transaction Limit

The public per-Provider amount used as the upper bound when an Admin considers support for eligible external losses. It is calculated automatically as 80% of the recognized Provider Bond, rounded down to the nearest 100,000 VND, and cannot be edited independently by an Admin. It is not a promise that every transaction will be compensated. _Avoid_: trust score, guaranteed payout, manually assigned limit.

### Provider Profile Version

An immutable historical snapshot of the Protection Provider's public identity, registered services, Registered Bank Accounts, official contact channels, exact recognized Provider Bond, Provider Tier, Recommended Transaction Limit, status, and publication consent. Every applied Bond change creates a new version; public history shows its date, Bond, and tier without exposing receipts, reconciliation evidence, or internal reasons. Eligibility is evaluated against the version effective when the reported transaction occurred, not later profile edits.

### Provider Profile Revision

A Provider-requested change that requires Admin verification before becoming a new Provider Profile Version; the previous version remains authoritative until publication. Changes to Facebook, Zalo, payment information, or registered services never publish automatically.

### Registered Service

A free-text description of a service that an Admin has approved for publication on a Protection Provider profile. Only a transaction within the approved wording can be a Support-Eligible Transaction. _Avoid_: category, unverified service.

### Registered Bank Account

A bank account verified for a Protection Provider and published for Real/Fake transaction checks. It contains only the bank identifier, full account number, verified account-holder name, and primary flag; P0 has no branch, account type, wallet, or per-account QR fields. A Provider may have at most ten Registered Bank Accounts, exactly one of which is the Primary Bank Account; account changes require a new Provider Profile Version, and removed accounts remain in immutable version history. _Avoid_: refund-only account, wallet account, unverified payment destination.

### Primary Bank Account

The single Registered Bank Account marked as the Protection Provider's preferred payment destination. Its primary status does not make the Provider's other registered accounts invalid. _Avoid_: only valid account, Avin receiving account.

### Verified Provider Information

The Provider-consented public identity and transaction data verified by an Admin, including the verified legal name, chosen display name, optional phone number, required Zalo, optional Facebook, Telegram, TikTok, YouTube, and website channels, full Registered Bank Account details, and the exact recognized Provider Bond. It is presented for Real/Fake comparison without a payment QR and does not expose CCCD fragments, KYC evidence, transfer receipts, or internal reconciliation notes.

### Provider Lifecycle Notification

An in-app message and verified-email notification sent when a Provider Deposit Intent is matched, an application enters review or needs changes, an application is approved or rejected, a refund completes, or an active Provider's Bond or Provider Tier changes. Public Zalo, Telegram, and other contact channels are not notification consent and receive no automated lifecycle messages in P0.

### Provider Verification Badge

A public indicator that the displayed Provider information was verified and the profile is active. It may be presented with the Provider Tier derived from confirmed Bond, but never carries a numeric trust score, fabricated support rating, or unconditional guarantee meaning. _Avoid_: insurance badge, trust score, Royal, guaranteed badge.

### Support-Eligible Transaction

A lawful direct Facebook or Zalo transaction with a Protection Provider that uses the registered identity, service, and payment information on the Provider profile and follows the published verification procedure. Excluded transaction types and transactions involving an impersonator are not eligible for Bond-backed support. _Avoid_: protected Order, insured transaction.

### Pre-Transaction Verification Evidence

The required screen recording showing the verified Provider identity, transaction box, registered payment information, and Provider confirmation before money or access is transferred. Its absence does not block a Public Risk Report but makes a transaction that requires it ineligible for Support Review.

### Support Review

An Admin's manual, off-platform evaluation of a reported `Support-Eligible Transaction` under the published support policy, opened only after a Risk Moderator confirms a Public Risk Report meets Provider, service, payment, scope, and evidence requirements. The affected person is entitled to consistent consideration, not an automatic payment, and the Admin records the decision without creating an in-app claim or moving money. _Avoid_: Protection Claim, Dispute, automatic compensation.

### Support Reconsideration

A single manual re-examination of a completed `Support Review` when new evidence or a procedural error is presented. It corrects review mistakes without creating an open-ended appeal process. _Avoid_: court appeal, repeated appeal.

### Support Allocation

An Admin-recorded amount of manually delivered support for verified loss from a Support-Eligible Transaction, capped in P0 at the smaller of the actual loss and the applicable Recommended Transaction Limit. P0 excludes indirect, website-operated, agent-deposit, lending, and other lower-priority loss groups. _Avoid_: payout, refund, insurance settlement.

### Protection Provider Status

The Provider's public standing: `ACTIVE`, `SUSPENDED_PENDING_REVIEW`, `WITHDRAWAL_PENDING`, `WITHDRAWN`, or `REMOVED_FOR_FRAUD`. Confirmed marketplace fraud requires a Provider review, while ordinary Seller suspension is only a review signal and never changes Provider standing automatically; withdrawn or removed Providers leave historical profiles at stable public addresses.

### Public Risk Report

An allegation owned by a `Risk Reporter` about any external account, website, social identity, or transaction, moving through `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `CHANGES_REQUESTED`, `REJECTED`, `PUBLISHED`, `CORRECTED`, or `REMOVED`. A Provider Owner may report itself or another Provider but must disclose the relationship for conflict-aware moderation. A draft may be deleted by its owner; after submission, the owner may request withdrawal but cannot erase the record, and an Admin may continue review when public safety requires it. Multiple account-owned reports about the same identifier or incident remain private and independently traceable but may be linked by an Admin to one public warning without creating shared ownership or revealing reporters to each other. It neither creates compensation rights nor changes a Provider Bond automatically. _Avoid_: anonymous report, Dispute, Protection Claim, verdict.

### Risk Reporter

The authenticated Buyer or Seller account privately attributable as the owner of a Public Risk Report. A valid session is sufficient to submit a report; reporting does not require 2FA. Seller Enforcement does not remove reporting access while the account can still authenticate, but security locks do; authorized moderation can see relevant enforcement context, declared Provider relationships, duplicate-report signals, and abuse controls applied by account and IP. Its account identity, contact details, marketplace role, and Provider relationship remain private from public warnings, which may describe the source only as an authenticated Avin user. Optional phone or Zalo details support authorized follow-up but never authentication; status notifications use the account's in-app channel and verified email. _Avoid_: anonymous visitor, accused person.

### Risk Report Workspace

The Risk Reporter's private area for managing drafts, reading review status and change requests, and viewing public-safe history for their own reports. Account deletion removes drafts, while submitted or published reports and a private reporter-identity snapshot remain under the applicable audit-retention policy; deleting the account ends workspace access but does not erase the moderation record. It never exposes Admin-only notes, private moderation evidence, or another reporter's activity. _Avoid_: Admin report queue, public warning page.

### Risk Identifier

A normalized bank, wallet, phone, website, social, or platform-account value attached to one or more Public Risk Reports for exact lookup and history grouping. Sensitive identifiers are masked in public projections even when an exact private search value matched. _Avoid_: accused person, fuzzy identity match.

### Risk Report Evidence

An immutable private original submitted to support a Public Risk Report and visible only to authorized Admins. Publication requires a separate `Public Evidence Copy`; an original is never exposed by default. _Avoid_: public attachment.

### Public Evidence Copy

An Admin-approved derivative of Risk Report Evidence with unrelated personal data redacted, metadata removed, and an Avin watermark applied. It is the only evidence asset permitted on a public report page.

### Risk Report Moderation Action

An immutable Admin decision to request changes, reject, publish, correct, or remove a Public Risk Report, recording the reason, actor, time, and prior/new state. Corrections and removals append history rather than silently editing the original decision.

### Risk Report Correction Request

A request by an authenticated Buyer or Seller account to correct or remove a published Public Risk Report; a person without an Avin account first uses the normal registration flow and becomes a Buyer. The original reporter uses the Risk Report Workspace; a reported subject or its authorized representative must sign in and provide evidence of identity ownership or authority to act, because account authentication alone does not prove that relationship. A valid session is sufficient to submit the request, without 2FA or an email-OTP-only path. An approved correction remains visible in the report history, while removal normally preserves a stable public tombstone unless law requires deletion.

### Verified Claimed Loss

The loss amount supported by evidence and accepted by an Admin for report statistics or Support Review; it remains a platform moderation finding rather than a court judgment. _Avoid_: legally adjudicated loss, guaranteed compensation.

### Public Support Outcome

A privacy-safe label stating that a Provider-related report is under verification, ineligible for support, handled by the Provider or program, or confirmed as a violation. It does not disclose the support amount, bank receipt, private discussion, or Admin-only reasoning.

### Protection Admin Permission

A least-privilege capability assigned to an Admin. `PROVIDER_REVIEWER` verifies applications and profile revisions but cannot mutate money; `RISK_MODERATOR` handles reports and support review; `SUPER_ADMIN` alone manages policy and performs manual reconciliation, refunds, and Bond adjustments, audited without dual approval. SePay still applies exact-match deposits automatically. P0 has no separate `BOND_OPERATOR` or `PROTECTION_MANAGER` role.

### Provider Admin List

The Admin operations list of Provider standing, showing legal name, status, Provider Tier, exact recognized Bond, Recommended Transaction Limit, full Primary Bank Account, verification date, and actionable warnings. Provider Reviewers may inspect application and identity-verification material with 2FA, while financial mutations remain restricted to `SUPER_ADMIN`. _Avoid_: masked operations list, public directory.

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

The authoritative marketplace policy record that governs an approved `Seller`'s commercial privileges independently of authentication security controls. It never applies to a prospective Seller before SellerApplication approval or automatically affects a separate `User` account believed to belong to the same person. Its lifecycle is `CLEAR` → `SUSPENDED` or `BANNED`, `SUSPENDED` → `CLEAR` or `BANNED`, and `BANNED` → `CLEAR` only when an appeal succeeds or an Admin corrects an erroneous decision; a suspension may expire automatically, while a ban never does. _Avoid_: strike, internal strike, using an account lock as Seller Enforcement.

Seller Enforcement takes effect immediately and does not itself disable login or revoke sessions; a security-driven account lock is a separate decision with its own reason and lifecycle. When both apply, the account lock prevents login and therefore temporarily prevents use of the compliance workspace, while Seller Enforcement remains unchanged; lifting either decision never lifts the other, and an externally accessible support route remains available for appeal. `SUSPENDED` Sellers have their Store profile and Listings suppressed from public access and cannot accept new sales, request withdrawals, or manage Listings, but may read existing Orders, files, and chats and continue any state-valid start, delivery, cancellation, chat, or Dispute-evidence action. `BANNED` Sellers retain only a compliance workspace where they may read existing Orders, files, chats, and financial records, review the enforcement decision, appeal, and submit evidence to an existing Dispute; they cannot sell, manage Listings, start, deliver or cancel OrderItems, or send ordinary Order chat messages.

Suspension never cancels an existing OrderItem. When a ban takes effect, each `AWAITING_SELLER` or `IN_PROGRESS` OrderItem that is not already `DISPUTED` is cancelled and fully refunded; `DELIVERED`, `IN_WARRANTY`, and `DISPUTED` items continue through Buyer review, Warranty, or Dispute, while terminal items remain unchanged.

The committed Enforcement Action is the boundary for concurrent work: an OrderItem or financial transition committed first remains authoritative, while a conflicting command committed afterward must observe enforcement and the latest item state. A timed suspension is lifted by a `SYSTEM` Enforcement Action at its deadline unless an earlier Admin action already lifted or escalated it; Store and Listing visibility may then return automatically, but frozen WithdrawalRequests still require explicit Admin review.

### Enforcement Action

An immutable record of applying, lifting, escalating, reversing, or correcting the stated reason for `Seller Enforcement`, including actor, effective time, prior and new state, a mandatory reason code (`FRAUD_RISK`, `POLICY_VIOLATION`, `FULFILLMENT_RISK`, `FINANCIAL_RISK`, or `OTHER`), a mandatory Seller-visible reason, and an optional Admin-only note. Commands are idempotent: retrying the same key returns the original result, while a new command with no state transition is rejected; a reason correction appends a `REASON_CORRECTED` Action that references the original, preserves the current state, and notifies the Seller instead of editing history. A 2FA-authenticated Admin may perform these actions; banning also requires explicit confirmation of the affected OrderItems, EscrowHolds, and WithdrawalRequests, but P0 requires no second Admin approval. Buyers affected by its operational consequences receive a neutral explanation, while neither the enforcement reason nor the Admin note is shown publicly on the Store.

### Enforcement Remediation

The tracked process that applies a ban's required cancellation and refund consequences after the Enforcement Action has already taken effect. Its lifecycle is `PENDING` → `RUNNING` → `COMPLETED` or `NEEDS_ATTENTION`; each affected OrderItem is processed idempotently, transient failures may retry, and unresolved failures remain visible to Admin without weakening enforcement. An Admin may inspect and retry failures but cannot skip a required refund, mark the process complete, edit financial history, or directly force an OrderItem or EscrowHold outcome; completion requires a valid outcome for every targeted item, and financial corrections use a new `REVERSAL` Transaction.

### Enforcement Appeal

A Seller's single evidence-backed request to review the currently effective `Enforcement Action`, with lifecycle `SUBMITTED` → `UNDER_REVIEW` → `UPHELD`, `OVERTURNED`, or `SUPERSEDED`. Any 2FA-authenticated Admin may review it in P0, including the original decision-maker, and must record a Seller-visible outcome reason plus any optional Admin-only note; an appeal does not pause enforcement or its refunds, while an overturned decision returns the Seller to `CLEAR` without reopening a refunded OrderItem or reversing a completed refund. An appeal becomes `SUPERSEDED` if its target action is lifted, expires, or is replaced by escalation before review completes; its immutable history and evidence remain, and the Seller may appeal the newly effective action separately.

### Enforcement Appeal Evidence

A private, immutable file submitted by the Seller for an `Enforcement Appeal`, visible only to that Seller and authorized Admins. It cannot be edited or deleted after submission; an Admin may quarantine it from normal views while preserving the original for audit, and no Buyer or other Seller may discover the Appeal through it.

### Listing

The canonical offering created by a `Seller` for purchase on the marketplace. A `Listing` belongs strictly to **one `Category`** (sub-category). A Seller may create or save a `DRAFT` Listing before completing the Store profile, but publishing an eligible Listing requires a complete Store profile. Once published, the Listing's visibility is independent of how many other Listings the Store has. Types of `Listing`:

- **`SERVICE`**: Manual digital service requiring buyer-submitted inputs and seller manual delivery/fulfillment (e.g., account unlock, custom setup).
- **`COURSE`**: Educational or digital asset package whose content is managed outside Avin by the `Seller`. The `Seller` manually delivers the buyer's access through the `Order` fulfillment flow; Avin does not host course content or manage enrollment.

In P0, Listings are published immediately and reviewed through a single global post-moderation policy; Sub-Categories do not override this policy. A draft requires an owner, type, and one active Sub-Category but may otherwise be incomplete. Publishing or resuming validates the complete public contract: title, description, immutable slug, and primary image; for a `SERVICE`, it also requires one or more `ServicePackage`s available for new purchases, while a `COURSE` retains its existing single Listing-level commercial contract. Each Listing has an immutable, globally unique public slug, distinct from its internal identity. For a `SERVICE`, the Listing's commercial price is defined by its `ServicePackage`s and a Buyer selects exactly one package for each purchase; a `COURSE` keeps its standalone Listing price. Each `SERVICE` package has a positive integer VND price; discounts, quantity rules, inventory, and automatic delivery remain out of scope. P0 imposes no fixed maximum number of packages on a `SERVICE` Listing. When a `SERVICE` Listing is summarized by price, the displayed starting price is the lowest price among its available packages; its detail presents each available package and its contract in ascending price order. Publishing requires at least one image, including a designated primary image; other media types are out of scope. Each `SERVICE` package's Processing Expectation, WarrantyPolicy, and ServiceInputFields are displayed or collected as part of that package and snapshotted on the purchased OrderItem; a `COURSE` retains the existing Listing-level contract. An eligible Seller may edit a `DRAFT`, `PAUSED`, `PUBLISHED`, or `HIDDEN` Listing; edits to a published Listing immediately affect future Buyers, while a hidden Listing remains hidden until an Admin restores it. Non-public Listings are accessible only to their owner and authorized Admins, never to Buyers or other Sellers. A Listing is `DRAFT`, `PUBLISHED`, `PAUSED`, `HIDDEN`, or `ARCHIVED`: Sellers control `PAUSED`, Admins control `HIDDEN`, and `ARCHIVED` is terminal. Seller Enforcement suppresses public availability without changing this Listing state, so lifting enforcement reveals only Listings whose own state and other publication gates still permit it. A Seller may publish a draft, pause or archive any of their non-archived Listings, and resume a paused Listing. An Admin may hide a published Listing, restore a hidden Listing only when its publication gates pass, and archive any non-archived Listing. Draft Listings that have never entered the public lifecycle may be hard-deleted by their owner; public-lifecycle Listings are never hard-deleted, and archival preserves their moderation audit and historical media references. An unavailable Listing cannot be newly purchased: a Cart retains it as unavailable and blocks checkout until the Buyer removes it, while completed OrderItems retain their Listing and, for a `SERVICE`, its selected `ServicePackage` snapshot. Admin moderation actions require a reason and create an audit record containing the Listing, action, actor, timestamp, reason, and prior/new visibility state. Every transition into `PUBLISHED`—Seller publish, Seller resume, or Admin restore—requires a complete Store profile, an approved non-enforced Seller, and acceptance of the current Seller Agreement; Listing creation and management require the Seller to be approved and non-enforced.

### ServicePackage

A named purchase option within a `SERVICE` Listing that lets a Seller offer different scopes of the same service at different prices. A `ServicePackage` has a required name that is unique within its Listing and owns its scope, price, Processing Expectation, WarrantyPolicy, and ServiceInputFields. It is not a separately routable public identity; the Listing owns the public slug and presentation. Its positive integer VND price is the commercial amount used for the `OrderItem`, `EscrowHold`, and current Sub-Category commission at Checkout. A Seller may add a new package or edit an existing package while its Listing is public; those changes take effect immediately for future Buyers and apply only to them, while existing `OrderItem`s retain the package snapshot accepted at purchase. A Seller may make a package unavailable for new purchases without making the whole Listing unavailable, provided another package remains available; the last available package cannot be made unavailable while the Listing remains `PUBLISHED`, so the Seller must pause the Listing to stop all sales. A package that has been public or referenced by an `OrderItem` is never hard-deleted; it is made unavailable while historical snapshots remain intact. Only a never-public, never-ordered draft package may be hard-deleted. Package changes follow the Listing's global post-moderation policy; an Admin moderates by hiding the whole Listing rather than managing a separate package moderation state. When a Listing offers multiple available packages, the Buyer must explicitly select exactly one before adding it to the Cart or purchasing it; a single-package Listing may select that package implicitly. The selected package is captured in the `OrderItem` snapshot. _Avoid_: Variant, Add-on.

Changes to a package's price, name, scope, Processing Expectation, WarrantyPolicy, or ServiceInputFields are material contract changes and require explicit Buyer confirmation at Checkout when that package was already reviewed or retained in the Cart. Presentation-only changes do not change the package contract.

Pausing or resuming a `SERVICE` Listing does not change any `ServicePackage` availability. Resuming requires at least one package available for new purchases and does not automatically reactivate packages the Seller previously made unavailable.

Admin hide and restore changes only the Listing's visibility; it preserves each package's availability. Restoring a hidden Listing requires at least one package available for new purchases.

### Category

A 2-level, Admin-managed hierarchical taxonomy (Parent Category $\rightarrow$ Sub-Category) used to organize `Listing`s across the marketplace. Sellers select an existing Sub-Category; they cannot create or change the taxonomy in P0.

- **Lifecycle & Visibility**: Categories exist in `ACTIVE`, `HIDDEN`, or `ARCHIVED` (terminal) status. Hiding or archiving a Parent Category automatically cascades to all its Sub-Categories. A Listing may be created, moved, published, or resumed only in an `ACTIVE` Sub-Category. Listings linked to a hidden or archived Category are suppressed from all public discovery and detail views without changing their own Listing status.
- **Ordering**: Both Parent Categories and Sub-Categories support an explicit `sortOrder` for display positioning.
- **Slugs**: Parent Category slugs are globally unique. Sub-Category slugs are unique within their parent (`UNIQUE(parent_id, slug)`). Slugs are auto-generated from name and editable on creation, but immutable once created.
- **Commercial & Templates**: Each **Sub-Category** holds an Admin-configured `commissionRatePercent`, reusable default `ServiceInputField` and `WarrantyPolicy` templates, and `WarrantyBounds` (min/max duration in hours). For a `SERVICE`, its templates initialize the first `ServicePackage` of a new Listing, which may tailor its own fields and policy; a package with a timed warranty must remain within the selected Sub-Category’s bounds, while explicit `NO_WARRANTY` is also valid. A `COURSE` retains its existing Listing-level commercial contract. Parent Categories are purely organizational and do not store commission rates.
- **Deletion**: An Admin may hard-delete a Category only if zero `Listing`s are linked to it; otherwise, the Category must be `ARCHIVED`.

### Cart

A persistent collection of a `User`'s intended purchases, which may contain `Listing`s from multiple `Seller`s. It contains at most one entry per Listing, with one unit per Listing in P0. A `SERVICE` entry retains the selected `ServicePackage`; a `COURSE` entry retains its Listing purchase intent. Changing the selected package updates that `SERVICE` entry rather than creating a second entry for the same Listing. An unavailable Listing or selected ServicePackage remains in the Cart and blocks `Checkout` only while selected, until the User changes the package, removes the entry, or deselects it. The Cart preserves the User's package choice when applicable but is not a commercial agreement or final price quote; Checkout revalidates the current Listing or package contract before money moves. A successful Checkout removes its selected entries; the Cart becomes `Order`s only through checkout.

### Checkout

The all-or-nothing purchase operation that converts the selected eligible entries of a `Cart` into one `Order` per `Seller`, one `OrderItem` per Listing, and one `EscrowHold` per OrderItem. Checkout revalidates every selected Listing and its Category; for a `SERVICE`, it also revalidates the selected `ServicePackage`, while a `COURSE` uses its current Listing-level contract. It then uses the current Listing or package contract and current commission rate from its Sub-Category at purchase time rather than a Cart-time quote. The Buyer pays the sum of the current integer VND prices for the selected `SERVICE` packages and current `COURSE` Listing prices; P0 adds no shipping, discount, buyer fee, or quantity multiplier. If the final price or any material Listing or package contract value—WarrantyPolicy, Processing Expectation, ServiceInputFields, or package scope—differs from what the Buyer reviewed, Checkout stops and requires explicit confirmation of the new contract before any money moves. It requires sufficient `UserWallet` Available Balance; Held Balance cannot fund a purchase. Concurrent Checkouts competing for the same Available Balance are resolved so that at most one can commit the contested funds, with no negative balance or duplicate hold. Selected Cart entries are consumed atomically, so competing Checkout requests cannot create duplicate purchases from the same entries. Repeating the same Checkout request returns its original outcome and never creates duplicate Orders, EscrowHolds, or Transactions. A deterministic business failure leaves the Cart unchanged and allows a new Checkout attempt after the Buyer fixes the cause. The Buyer supplies required `ServiceInputField` values during `SERVICE` Checkout; missing required values, invalid types, or undeclared fields reject the Checkout before money moves, and a successful Checkout snapshots the applicable Listing or package contract, commission rate, and valid values as part of each `OrderItem` and its `OrderCustomInput`s. A multi-item Checkout creates one aggregate `PURCHASE_HOLD` Transaction for wallet history while retaining one independent EscrowHold per OrderItem. Unselected Cart entries remain in the Cart. If any selected part cannot be completed, no Order, OrderItem, EscrowHold, or buyer-fund movement is committed.

### Order

A commercial agreement between exactly **one `User` (Buyer)** and **one `Seller`** for the purchase of one or more line items (`OrderItem`s) from that seller's listings.

- Multi-seller carts automatically split into **per-seller `Order`s** at checkout (1 Order = 1 Seller).
- An `Order` is a container and its displayed progress is derived from its `OrderItem`s; it has no independent fulfillment state machine. Each OrderItem proceeds independently, so a failure, dispute, or refund for one item does not cancel or settle the other items.
- Each `Order` has a real-time chat channel and contains the `EscrowHold`s and `Dispute`s for its items.
- Each Seller can access only their own Order and OrderItems, including only the Buyer inputs needed for those items; an OrderItem's Seller is derived from its Order, with no separate per-item assignment in P0. Sellers cannot see other Sellers' Orders or the Buyer's combined Cart.

### OrderItem

A line item within an `Order`, capturing the snapshotted `Listing`, its selected `ServicePackage` when the Listing is a `SERVICE`, the applicable price, quantity, commission rate, WarrantyPolicy, Processing Expectation, and buyer-provided inputs at the time of purchase. In P0, each OrderItem represents one purchased Listing with quantity one. Each `OrderItem` owns its fulfillment lifecycle, `EscrowHold` allocation, warranty period, and dispute outcome; the owning Seller explicitly starts fulfillment to move it from `AWAITING_SELLER` to `IN_PROGRESS`, while viewing the Order or sending a Message does not start work. Fulfillment must then move from `IN_PROGRESS` to `DELIVERED` through exactly one immutable `DeliverySubmission`; there is no direct `AWAITING_SELLER` to `DELIVERED` transition. The submission may contain multiple `OrderFile`s; only an explicit Buyer confirmation moves it into `IN_WARRANTY` before the deterministic 48-hour buyer-review timeout, while viewing, downloading, or messaging does not confirm delivery. The review clock starts at the server-recorded `deliveredAt` time of that submission; if the item remains `DELIVERED` at the deadline, an automated transition moves it into `IN_WARRANTY`. A Buyer confirmation racing with that timeout is resolved atomically: the first committed transition establishes the Warranty start, and the other request returns the current state without creating a duplicate event. The WarrantyPolicy period starts at confirmation or timeout. The Buyer alone may create one `Dispute` per item: after the Processing Expectation deadline from `AWAITING_SELLER` or `IN_PROGRESS`, during the 48-hour review in `DELIVERED`, or at any point in `IN_WARRANTY`; no Dispute may begin from `CLOSED`, `CANCELLED`, or `REFUNDED`. Opening an eligible Dispute atomically moves the item to `DISPUTED`, stops review and warranty timers, blocks automatic EscrowHold resolution, and leaves Seller with response/evidence actions only. Warranty expiry or a Dispute resolved in Seller's favor moves the item to `CLOSED`; a Dispute resolved as a full Buyer refund moves it to `REFUNDED`; pre-delivery cancellation moves it to `CANCELLED`. Admin has no arbitrary state override; Admin changes occur only through a defined policy action or Dispute resolution with a reason and audit record. `CLOSED` is the canonical post-warranty state name; `COMPLETED` is not a domain state name. If Seller has not delivered by the Processing Expectation deadline, the Buyer may open a late-delivery Dispute; the deadline does not automatically change the item state or refund the Buyer, and Seller may still act until the Dispute opens. The Buyer may cancel only while the item is `AWAITING_SELLER`, receiving a full refund and closing its EscrowHold; once work begins, problems use the Dispute path. The Seller may cancel in either pre-delivery state, `AWAITING_SELLER` or `IN_PROGRESS`, only with a recorded reason; this fully refunds that item and closes its EscrowHold without affecting other items. After `DELIVERED`, Seller cancellation is no longer available. Concurrent Buyer cancellation and Seller start are resolved by the first committed transition; the losing action is rejected.

An `OrderItem` with `NO_WARRANTY` does not enter `IN_WARRANTY`: after Buyer confirmation or the deterministic 48-hour review timeout from `DELIVERED`, it moves to `CLOSED` and its `EscrowHold` releases. The Buyer may still open a Dispute during the `DELIVERED` review, and an open Dispute blocks release.

While an `OrderItem` remains `AWAITING_SELLER` after its Processing Expectation deadline, Buyer may choose either direct cancellation for a full refund or a late-delivery `Dispute`.

Buyer cancellation before Seller starts fulfillment requires no mandatory reason; its lifecycle event still records the Buyer and effective time.

Competing fulfillment, cancellation, and Dispute commands are serialized by the first committed valid transition; if Delivery commits first, Buyer may still open an eligible Dispute from `DELIVERED`, but if Dispute commits first, Delivery is rejected.

Retrying the same successful fulfillment command returns its committed outcome without creating another lifecycle event, Notification, refund, or escrow movement; a different command invalid for the current state is rejected.

Rejected authorization or state requests may create a separate security audit record with actor, action, item, time, and reason, but never create a lifecycle event, Buyer timeline entry, Notification, or state change.

### DeliverySubmission

An immutable Seller submission attached to an `OrderItem` that records the result delivered to the Buyer and enables the transition from `IN_PROGRESS` to `DELIVERED`. It always includes a delivery note and may include private `OrderFile`s; it records the submitting Seller and submission time and cannot be edited or deleted. Only the Order's Buyer, owning Seller, and an authorized Admin may view it. Persisting the submission, changing the item state, and recording the lifecycle event are one atomic business operation. _Avoid_: delivery evidence represented only by a status flag.

### OrderItemLifecycleEvent

An immutable record of a successful `OrderItem` lifecycle transition, including the actor, effective time, prior and new state, and any relevant reason or artifact. The first event is recorded when Checkout creates the item in `AWAITING_SELLER`; Cart actions are not item lifecycle events. Automated transitions use `SYSTEM` as the actor and the business deadline as their effective time; a rejected request is not a lifecycle event. A Seller cancellation reason is included in the event and is visible to the Buyer. It is the source for the Buyer-visible item timeline and is visible only to the Order's Buyer, owning Seller, and authorized Admin.

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

The financial account belonging to a `Seller`, created when a `SellerApplication` is approved. Tracks:

- **Pending Escrow Balance**: Funds locked in active `EscrowHold`s pending completion and warranty expiration. The Seller cannot spend or withdraw these funds.
- **Available Balance**: Earned revenue cleared for withdrawal. Increases when an `EscrowHold` is released (after commission); decreases when the Seller creates a `WithdrawalRequest`.
- **Held for Withdrawal Balance**: Funds committed to active `WithdrawalRequest`s that have not yet been paid, rejected, or cancelled. Visible to the Seller but unavailable for new withdrawal requests.

The balances are the current summary of the SellerWallet and must always reconcile with the immutable `Posting`s in its `LedgerAccount`s. At Checkout, each `EscrowHold` increments Pending Escrow Balance. When that hold is released, Pending decreases and Available increases by the amount after commission; a refund decreases Pending without crediting the Seller. A `WithdrawalRequest` atomically decrements Available and increments Held for Withdrawal; rejection, cancellation, or payment resolves the hold. In P0, a `Seller` requests withdrawal of at least `5,000 VND` from Available Balance to their verified bank account; an Admin approves and pays the request manually.

### WithdrawalRequest

A Seller-initiated request to withdraw a specified integer VND amount (minimum 5,000 VND) from `SellerWallet` Available Balance to the Seller's verified bank account. Creating the request atomically decrements Available Balance and increments Held for Withdrawal Balance, preventing over-withdrawal from concurrent requests. The request snapshots the Seller's bank account details at creation time; Admin verifies and pays against this snapshot, not the Seller's current profile.

- **Lifecycle**: `REQUESTED` → `APPROVED` → `PAID`, with `REJECTED` (from `REQUESTED` or `APPROVED`) and `CANCELLED` (Seller-initiated, from `REQUESTED` only). `PAID`, `REJECTED`, and `CANCELLED` are terminal.
- **Ledger**: `REQUESTED` records a `WITHDRAWAL_REQUEST` Transaction (debit `SELLER_WALLET_AVAILABLE`, credit `SELLER_WALLET_HELD`). `PAID` records a `WITHDRAWAL_PAID` Transaction (debit `SELLER_WALLET_HELD`, credit `PLATFORM_BANK_CLEARING`). Rejection or cancellation records a `REVERSAL` of the original `WITHDRAWAL_REQUEST`. `APPROVED` is a workflow checkpoint with no financial Transaction.
- **Admin actions**: Approve requires no reason. Reject requires a reason visible to the Seller. Mark paid requires a bank transfer reference.
- **Enforcement**: When a Seller is suspended or banned, existing `REQUESTED` and `APPROVED` requests are frozen — Admin decides each one manually as part of the enforcement review — and new requests are blocked. Existing EscrowHolds continue to resolve according to their OrderItems, and legitimate releases still increase Available Balance; enforcement prevents withdrawal rather than stopping financial accounting. Lifting or expiry does not automatically resume, approve, reject, or pay a frozen request.
- **Multiple concurrent requests**: Allowed. Each holds its portion of Available Balance independently.

_Avoid_: Payout, cash-out.

### EscrowHold

A financial hold entity tied 1-to-1 with an `OrderItem`. Holds the item's full buyer payment in escrow during fulfillment and warranty before independently releasing funds to `SellerWallet` after that item's Warranty expiry (minus platform commission) or refunding `UserWallet`; platform commission is recognized only at release and is rounded down to an integer VND amount. At the fixed Warranty expiry, an item still in `IN_WARRANTY` with no Dispute is atomically moved to `CLOSED` and its EscrowHold is released; an open or concurrently committed `Dispute` blocks release until Admin resolution. It is created atomically with moving the matching amount from `UserWallet` Available Balance to Held Balance. A pre-delivery OrderItem cancellation sets the item to `CANCELLED`, the funded EscrowHold to `REFUNDED`, and records a `REFUND` Transaction; `CANCELLED` is reserved for a hold voided before funds are held. A release records one atomic Transaction for the OrderItem containing both the Seller proceeds and platform commission postings. `RELEASED`, `REFUNDED`, and `CANCELLED` are terminal outcomes; an EscrowHold is never reopened.

For an `OrderItem` with `NO_WARRANTY`, the EscrowHold releases when the `DELIVERED` review ends through Buyer confirmation or the 48-hour timeout, unless a Dispute has already blocked the release.

### LedgerAccount

An account in Avin's financial ledger representing where monetary value is held or owed, including platform bank clearing, UserWallet Available and Held balances, SellerWallet Pending, Available, and Held for Withdrawal balances, escrow, and platform commission.

### Posting

An immutable debit or credit applied to one `LedgerAccount` as part of a `Transaction`. Every Transaction has at least two Postings whose debits and credits balance exactly.

### Transaction

An immutable, authoritative financial event composed of balanced `Posting`s. Participant-facing wallet history exposes one meaningful item per monetary event (`DEPOSIT`, `PURCHASE_HOLD`, `ESCROW_RELEASE`, `REFUND`, `WITHDRAWAL_REQUEST`, `WITHDRAWAL_PAID`, `REVERSAL`); `PLATFORM_COMMISSION` is represented by postings in an `ESCROW_RELEASE` Transaction rather than a separate participant-facing event. A multi-item Checkout has one aggregate `PURCHASE_HOLD`; each OrderItem's EscrowHold resolution has one atomic release or refund Transaction. A deposit is credited only after an idempotent, verified payment-provider notification; its provider transaction ID uniquely identifies the credit, so a retried notification cannot create money twice. One `Deposit request` may be credited automatically at most once; any later payment with a distinct provider transaction ID requires `Deposit reconciliation`. A financial correction never edits or deletes history: a REVERSAL Transaction links to and posts the exact inverse of the original Transaction before any corrected Transaction is appended. An automated reversal cannot make a wallet balance negative; an insufficient-balance correction requires separate operational handling.

### Dispute

An entity initiated by a `User` when an `OrderItem` cannot be resolved directly with the `Seller` during the 48-hour delivery review, after a missed Processing Expectation deadline, or during the `IN_WARRANTY` period. It suspends that item's `EscrowHold` release and escalates the item to platform Admin mediation; a late delivery does not automatically close the Dispute. In P0, mediation has exactly one auditable outcome: either a full refund to the `User` or full escrow release to the `Seller`; partial refunds and repeated resolution are out of scope.

### Review

A rating (1–5 stars) and optional feedback comment submitted once by a `User` for an `OrderItem` in `IN_WARRANTY` or `CLOSED` status within 30 days of the Buyer confirming delivery (or transitioning to `IN_WARRANTY`/`CLOSED`); `AWAITING_SELLER`, `IN_PROGRESS`, `DELIVERED`, `DISPUTED`, `REFUNDED`, and `CANCELLED` items are not reviewable. If a Review is submitted during `IN_WARRANTY` and the item is later refunded via a Dispute resolution, the Review remains intact. For a `SERVICE`, the review is displayed with the purchased `ServicePackage` name while remaining part of the Listing's shared review context. The reviewer is identified publicly by a masked name (e.g., "Ngọc L.").

A submitted Review is immediately public and immutable: the Buyer cannot edit or delete it. An Admin may hide a review with a required reason and an audit record (actor, action, review, timestamp, reason, prior/new visibility state); a hidden review is excluded from Listing and Seller aggregate metrics, which are recalculated on hide and restore. Reviews attached to hidden or archived Listings remain in the Seller-level aggregate. Seller responses to reviews are out of scope in P0.

Aggregate metrics displayed on each Listing include the simple arithmetic mean rating, rating count, star distribution, and per-Listing completed-order count (CLOSED OrderItems for that Listing). Each Seller profile displays an aggregate rating, rating count, and completed-order count (CLOSED OrderItems across all the Seller's Listings). All review and aggregate data is accessible to unauthenticated visitors.

_Avoid_: Feedback, testimonial.

### Message

A durable, append-only message exchanged within an `Order`'s dedicated chat channel. A `User` and `Seller` may send Messages throughout the Order; an Admin may send a visibly attributed mediation Message only while a `Dispute` is open. Every Message is permanently stored as part of the order history and delivered live to participants; real-time delivery events are not the source of truth. Participants cannot edit or delete a sent Message; an Admin may redact it from normal views while preserving the original for audit and dispute review. Admin access to the chat is audited.

### OrderFile

A private, immutable file shared as a chat attachment, buyer input, or fulfillment deliverable within an `Order`. Access is limited to that Order's `User`, `Seller`, and an authorized Admin. A submitted file cannot be overwritten or deleted by a participant; an Admin may quarantine or redact it from normal views while preserving the original and its audit trail.

### DisputeEvidence

A private, immutable file submitted as evidence for a `Dispute`. Access is limited to the Dispute's parties and an authorized Admin. Submitted evidence cannot be overwritten or deleted by a participant; an Admin may quarantine or redact it from normal views while preserving the original and its audit trail.

### Notification

An in-app or system alert sent to a `User`, `Seller`, or authorized `Admin` as a per-recipient record when an allowlisted lifecycle event succeeds; an `OrderItem` transition is one source, not the only source. The P0 catalog is: `SellerApplication` submitted/approved/rejected; `Listing` hidden/restored/archived; every committed `OrderItem` lifecycle transition; `Dispute` opened/deadline/resolved; important deposit, withdrawal, refund, and reversal `Transaction` outcomes; Seller Enforcement action applied/lifted/appeal resolved and Enforcement Remediation needing attention; and `Review` created. Failed commands, read-only queries, drafts, and `Chat Messages` are not Notifications. Each Notification references a stable event identity (`eventType`, `sourceType`, `sourceId`) rather than pretending every source is an `OrderItem` event. Recipients follow the event's affected parties: Buyers and Sellers receive their own lifecycle outcomes, while Admin receives unassigned operational alerts and attention-required outcomes. An Enforcement Action immediately notifies the Seller of its state, Seller-visible reason, restrictions, and appeal path and sends affected Buyers only a neutral protection notice; a refund is announced only after its financial `Transaction` commits, and Admin is alerted when Enforcement Remediation needs attention. A Notification contains safe context and points to an authorized detail rather than exposing sensitive snapshots. Each lifecycle event emits at most one deduplicated Notification to each appropriate recipient. Critical Notifications may also enter retryable email delivery, and reading one recipient's Notification does not change another recipient's state.

### Notification inbox

The per-recipient view of a `User`'s, `Seller`'s, or `Admin`'s Notifications, ordered by recency and supporting cursor pagination, unread filtering/counts, and idempotent one-at-a-time or mark-all read actions without deleting alerts. Buyer and Seller inboxes live in the web app; the Admin inbox lives in the Admin app. A Notification's deep link opens an authorized detail route and falls back to a safe destination when the target is no longer accessible. It is separate from the unread state of `Order Chat`.

### Email delivery

A separate durable record for a critical Notification's email attempt, keyed uniquely by event, recipient, and channel. It moves through `pending`, `retrying`, `sent`, or `failed`, records attempts, next retry time, and the last error, and is retried at most five times over 24 hours. A provider-neutral sender adapter wraps the existing Resend integration; a worker sends email outside the business transaction, so delivery failure never rolls back the committed event or in-app Notification. An Admin may retry a terminal failure through an authorized, audited command, which starts one new bounded retry window rather than allowing infinite retries. Email-delivery records remain available for Operations health; AVIN-25 does not define automatic Notification retention or deletion.

---

## 2. Value Objects

### Money / Price

An immutable value object representing monetary value in Vietnamese Đồng (`amount: integer`, `currency: 'VND'`).

### Processing Expectation

A positive whole-number estimate, in hours, of the time a Seller expects to need before fulfillment. For a `SERVICE`, it belongs to the selected `ServicePackage`; for a `COURSE`, it remains part of the Listing-level contract. It is displayed to Buyers and snapshotted on each purchased `OrderItem`; its deadline begins at successful Checkout.

### WarrantyPolicy

An immutable snapshot embedded on a `ServicePackage` for a `SERVICE`, or on the Listing-level contract for a `COURSE`, and copied to each `OrderItem` at purchase time. It is either a timed policy (`durationHours: number`, `terms: string`) or an explicit `NO_WARRANTY` policy. A timed policy defines the warranty protection period during which the item's funds remain in escrow; the period begins when Buyer confirmation or the deterministic buyer-review timeout moves the delivered item into `IN_WARRANTY`. For the timeout path, the effective start is the fixed `deliveredAt + 48 hours` deadline even if the scheduler processes the transition later.

### ServiceInputField

An embedded definition schema specifying required custom inputs from the Buyer (e.g., `[{ key: 'profile_link', label: 'Link Profile', type: 'text', required: true }]`). For a `SERVICE`, the schema belongs to its `ServicePackage`; for a `COURSE`, it remains part of the Listing-level contract. Field keys are unique within their owning contract.

### Listing Media

An image attached to a Listing. It is visible to its Seller and Admin while private, and to Buyers only while the Listing and its Category are publicly available.

### OrderCustomInput

A key-value snapshot of the buyer's submitted form responses attached to an `OrderItem`; file values reference private `OrderFile`s within that Order.

---

## 3. Aggregate Boundaries

1. **`UserAggregate`**: `User` + `UserWallet`
2. **`SellerAggregate`**: `Seller` + `SellerWallet` + `WithdrawalRequest`s + Bank Details + `Seller Enforcement` + `Enforcement Action`s + `Enforcement Remediation` + `Enforcement Appeal` + `Enforcement Appeal Evidence`
3. **`ListingAggregate`**: `Listing` + `ServicePackage`s for `SERVICE` Listings (including their `ServiceInputField` definitions and `WarrantyPolicy`) + `Category`
4. **`OrderAggregate`**: `Order` + `OrderItem`s + `OrderCustomInput` + per-item `EscrowHold`s + `DeliverySubmission`s + `OrderChat` (Messages)
5. **`DisputeAggregate`**: `Dispute` + `DisputeEvidence`
6. **`ReviewAggregate`**: `Review` + review moderation audit record

---

## 4. Key Relationship Cardinalities

- **`User` $\leftrightarrow$ `Seller`**: Strictly 1-to-0 (Separate accounts and login credentials).
- **`Listing` $\rightarrow$ `Category`**: Many-to-1 (Strictly single sub-category per listing).
- **`SERVICE Listing` $\rightarrow$ `ServicePackage`**: 1-to-many (a SERVICE Listing offers one or more selectable packages; COURSE has no ServicePackage).
- **`Order` $\rightarrow$ `Seller`**: Many-to-1 (1 Order = 1 Seller strictly).
- **`Order` $\rightarrow$ `User`**: Many-to-1.
- **`SERVICE OrderItem` $\rightarrow$ selected `ServicePackage`**: 1-to-1 (the purchased package is snapshotted on the item).
- **`OrderItem` $\rightarrow$ `EscrowHold`**: 1-to-1.
- **`OrderItem` $\rightarrow$ `Dispute`**: 1-to-0..1.
- **`OrderItem` $\rightarrow$ `OrderItemLifecycleEvent`**: 1-to-many.
