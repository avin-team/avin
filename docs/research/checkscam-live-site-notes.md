# CheckScam feature study and Avin implementation brief

Research date: 2026-08-20 (Asia/Ho_Chi_Minh)

Scope: public, first-party pages at `checkscam.vn` and `admin.checkscam.vn`, the seven screenshots supplied by the user, and Avin's first-party source code. This is a behavioral and implementation study, not an endorsement of CheckScam's claims or a recommendation to copy its branding/content. No product code was changed.

## Executive recommendation

Do **not** begin by cloning CheckScam's public accusation database. Avin already has the safer foundations for a marketplace-native trust-and-safety system: transaction-linked Disputes, private immutable evidence, authenticated Reviews, Seller Enforcement and appeals, a 2FA-protected Admin app, notifications, and audit logs. Build on those foundations in a new **Trust & Safety** bounded context.

The recommended sequence is:

1. Private, Avin-transaction-linked safety cases and moderation.
2. Public Seller trust signals derived from verified Avin events.
3. Exact-match public lookup of carefully masked, approved notices only after legal/privacy review.
4. External bank/phone/social/website allegations only after the operating team can meet evidence, response, appeal, removal, retention, and security obligations.

The core architectural rule is to separate a private `SafetyCase` from a derived public `SafetyNotice`. A submission is an allegation, not a public record and not a legal finding. Raw evidence, reporter contacts, full bank/phone identifiers, and internal moderation notes must never be serialized through public procedures.

## Method and confidence

- **Verified** means visible in a supplied screenshot or present in first-party HTML retrieved on 2026-08-20.
- **Inferred** means a likely implementation behavior that was not directly exercised.
- The interactive browser was unavailable, so no forms were submitted, no files were uploaded, and no search result was clicked through in a live browser. Read-only first-party retrieval was used instead.
- Counts are live and changed across screenshots and retrievals. They should be treated as dynamic observations, not stable facts.

Primary sources:

- [Public admin directory](https://admin.checkscam.vn/)
- [Example admin profile](https://admin.checkscam.vn/nguyen-hoang-duong/)
- [Admin rules](https://admin.checkscam.vn/dieu-khoan-admin/)
- [Transaction rules](https://admin.checkscam.vn/noi-quy-giao-dich/)
- [Statistics](https://checkscam.vn/thong-ke/)
- [Report form](https://checkscam.vn/to-cao-lua-dao/)
- [Example public warning](https://checkscam.vn/nguyen-anh-hoa/)
- [Publishing and dispute process](https://checkscam.vn/quy-trinh-dang-tai-xu-ly-bai-canh-bao-lua-dao/)
- [System map](https://checkscam.vn/so-do-he-thong-checkscam/)
- [Data/transparency statement](https://checkscam.vn/cam-ket-du-lieu-thong-tin/)
- [Terms of use](https://checkscam.vn/dieu-khoan-su-dung/)
- [Contact/complaints](https://checkscam.vn/lien-he/)

## Product shape

The public product has four connected surfaces:

1. A multi-identifier scam lookup and warning database.
2. A public submission flow for three report types.
3. A public directory of paid/approved service-provider profiles called "Admin" profiles.
4. A statistics view built from approved warnings, claimed loss amounts, and comments.

Here, **Admin** is also a public service-provider role. The public directory is not evidence of an internal moderation dashboard.

## Verified feature behavior

### 1. Lookup/search

- The system map says the principal search supports bank-account numbers, phone numbers, website links, and Facebook links. Current public inputs also mention Zalo and TikTok. The same global search is visible on the warning/detail page and statistics page. Sources: [system map](https://checkscam.vn/so-do-he-thong-checkscam/), [statistics](https://checkscam.vn/thong-ke/), [example warning](https://checkscam.vn/nguyen-anh-hoa/).
- Search results resolve to public warning pages with readable slugs. A detail page can group multiple reports under the same identifier in a "report history for this account" section. Source: [example warning](https://checkscam.vn/nguyen-anh-hoa/).
- The admin directory has a separate input labeled for finding an admin or service. The page contains a numbered avatar/name directory with links to individual profiles. Screenshot #2 and [admin directory](https://admin.checkscam.vn/).

Not verified: exact-versus-fuzzy matching, normalization, result ranking, no-result behavior, whether admin filtering occurs as the user types, and anti-enumeration limits.

### 2. Public admin directory and profile

The directory is a dense, numbered grid of circular avatars and names. The retrieved page listed more than 300 linked profiles; screenshot #2 shows the first 70 in a ten-column desktop grid. Source: [admin directory](https://admin.checkscam.vn/).

The example profile includes:

- Avatar and display name.
- Direct verification/contact links for Zalo and a CheckScam community.
- Facebook numeric ID/link, Zalo phone, a QR code, and an optional shop/profile link.
- Profile tier (Silver in this example), support rating, trust score, join date, and recommended transaction ceiling.
- Registered services.
- Registered account-holder name and a list of bank or wallet accounts.
- A visual verification seal/watermark.

Screenshot #1 and [Nguyễn Hoàng Dương profile](https://admin.checkscam.vn/nguyen-hoang-duong/).

The admin rules explain that provider profiles have a recommended transaction amount, can be upgraded/downgraded/suspended/withdrawn, and are ordered by verification join time. The trust score starts at 100, gains a small amount monthly up to the cap, and loses points for support/transaction problems. Rating bands map score ranges to labels. The rules also describe application review, fees, provider obligations, and dispute handling. Source: [admin rules](https://admin.checkscam.vn/dieu-khoan-admin/).

Important: the profile's "recommended amount" is framed as a reference/limit in the rules; it should not be presented as a bank guarantee without a separately documented and legally reviewed guarantee product.

### 3. Report submission

The report page is one route with three tabs. Required fields are marked with an asterisk. Screenshots #4–#6 and [report form](https://checkscam.vn/to-cao-lua-dao/).

#### Bank-account scam

- Account-holder name
- Receiving account number
- Bank
- Optional Facebook/TikTok link
- Evidence upload for transfer receipt and transaction chat
- Claimed amount in VND
- Narrative
- Reporter email
- Searchable Zalo contact
- Reporter-role choice: posting for someone else or being the victim/responsible author
- Submit-for-review button

#### Website scam

- Website URL
- Scam category; the page lists money theft, information theft, crypto, impersonation, harmful content, malware/virus, and other
- Evidence upload; the UI names PNG, JPG, and GIF
- Description
- Contact email (present in retrieved HTML even though screenshot #5 does not show it)
- Terms acceptance
- Submit-for-review button

The page says approved website reports are passed into a third-party blocklist workflow. That integration is a site claim; delivery, latency, and success behavior were not exercised.

#### Purchased account taken back / hijacked

- Platform
- Account or ID
- Evidence upload
- Narrative
- Reporter name, email, and searchable Zalo
- Ownership-role choice: reporter bought it or is reporting for a friend
- Submit-for-review button

#### Submission outcome

The page contains success-state text saying reports are reviewed within 48 hours, results are emailed, and reporters should later search the submitted identifier. The live page also exposes a pending-report count in its global header. Source: [report form](https://checkscam.vn/to-cao-lua-dao/).

Not verified: client/server validation, upload size/count limits, CAPTCHA, duplicate detection, email delivery, autosave, progress, error states, or whether submission requires a logged-in account.

### 4. Moderation, publication, complaints, and removal

The published process describes this workflow:

1. Anyone can submit, but a warning needs transaction proof and a reachable Zalo contact.
2. The platform reviews the submission; accepted items become public warning records.
3. The reporter may request removal using the original contact channel and provide the warning link plus reason.
4. The accused party may appeal by sending the warning link and a reason to support.

The process says the reporter may be asked to participate in verification and is legally responsible for false or defamatory content. It also says the platform does not guarantee that all information is accurate, complete, or current. Sources: [publishing/dispute process](https://checkscam.vn/quy-trinh-dang-tai-xu-ly-bai-canh-bao-lua-dao/), [terms](https://checkscam.vn/dieu-khoan-su-dung/), [contact page](https://checkscam.vn/lien-he/).

This implies a moderation state model such as `submitted → under_review → approved/rejected → published → appealed/removed`, but those exact states and an internal operator UI were **not** observed.

### 5. Statistics

The statistics page contains:

- Three cumulative summary cards: reported phone/account identifiers, Facebook IDs, and comments.
- A note that the dataset starts on 2020-05-28.
- A periodic-report section with day/month/year tabs.
- Each period card shows approved-warning count, claimed amount, and comment count.
- A note that claimed-loss aggregation starts on 2026-05-20.
- A paginated list of recent warnings with title, date, views, and amount where present.

Screenshot #3 and [statistics](https://checkscam.vn/thong-ke/).

The live values were not snapshot-consistent: cumulative counts and the current day's values changed across retrievals, as expected for live data, but at least one monthly approved count also appeared unusually large relative to surrounding daily/year totals. Build these aggregates from a single documented event model, expose `last updated`, and add reconciliation checks.

### 6. Public warning/detail page

Screenshot #7 and current first-party warning pages show this layout and behavior:

- Global warning header, live counts, lookup input, and navigation to reporting, statistics, community, and skills.
- Structured warning fields: accused account-holder/name, masked account/phone, bank, category, evidence gallery, claimed loss, and narrative.
- Prominent disclaimer that the record is a community warning/reference, not an official legal finding.
- Record metadata: approval date, last update, view/search count, and number of related reports.
- Actions for comments, copying the link, requesting removal, Facebook sharing, and copying a share link.
- Related-report/history list grouped by the same account identifier.
- Reporter section with masked contact data.
- Anonymous/pseudonymous comments, a visible daily remaining-post quota, comment form, and published comment list.
- Advertising placements interleaved with content and a right-side desktop ad rail in screenshot #7.

Source: [example warning](https://checkscam.vn/nguyen-anh-hoa/) and screenshot #7. The exact `tran-tuan-ngoc` page in screenshot #7 timed out during retrieval, so its textual details are treated as screenshot evidence only.

## What is inference, not verified behavior

- A relational/domain model with `Report`, `SubjectIdentifier`, `EvidenceAsset`, `ModerationDecision`, `Appeal`, `Comment`, `ProviderProfile`, and `AggregateSnapshot` would fit the screens, but the site's storage model is unknown.
- The statistics probably derive from approved reports and comments, but the aggregation jobs/API were not observed.
- Search likely normalizes account/phone/link inputs and joins multiple reports by identifier, but exact matching and deduplication rules are unknown.
- Provider scores likely update from moderation/support events, but only the published scoring rules—not the implementation—were verified.
- No internal moderator, provider self-service, authentication, or authorization screens were observed.

## Abuse, privacy, security, and legal concerns

These should be requirements for any similar feature, not postponed hardening.

### Critical privacy leak to avoid

A current warning visually masks the accused account number in the body, but the same first-party HTML exposes the full account number in top-of-page metadata/text before the masked rendering. This was verified on [the example warning](https://checkscam.vn/nguyen-anh-hoa/). Masking only the visible component is ineffective: generated metadata, JSON-LD, Open Graph tags, API responses, logs, analytics, caches, and search indexes must use the same disclosure policy.

### Data minimization and consent

- Public provider profiles expose full phone/account details and QR codes. If Avin offers this, require explicit, revocable publication consent, purpose limitation, retention rules, and a fast takedown/update path.
- Warning evidence can contain chat, payment, identity, and third-party data. Keep originals private during review; redact faces, addresses, unrelated account numbers, access tokens, and other bystander data before publication.
- Reporter contacts are visually masked on warning pages, but unmasked values must be encrypted, access-controlled, audited, and excluded from client payloads.
- The site's transparency page says it does not collect user data, while the report forms require reporter email/Zalo and sometimes name. That is an internal policy contradiction visible in first-party sources. Avin's privacy notice and consent copy must accurately enumerate every collected field and each downstream disclosure. Sources: [data statement](https://checkscam.vn/cam-ket-du-lieu-thong-tin/), [report form](https://checkscam.vn/to-cao-lua-dao/).

### Defamation and procedural fairness

- A user-submitted accusation can cause serious reputational and financial harm. Use evidence requirements, clear provenance, trained moderation, an audit log, reason codes, notice to the affected person where lawful, an appeal/removal SLA, correction history, and escalation for high-impact cases.
- Avoid labels that imply a legal finding. Preserve a prominent "community report / not adjudicated" status and show moderation confidence/provenance separately from the allegation.
- Comments can compound harassment and doxxing. Moderate them independently, rate-limit, provide report/block tools, and prevent public replies from exposing new personal data.

### Upload and content security

- Validate file signatures rather than trusting extensions/MIME; set count/size/pixel limits; decode and re-encode images; strip EXIF; malware-scan; quarantine originals; serve from an isolated asset domain; and use signed URLs before approval.
- Sanitize narratives/comments as untrusted text and protect all mutations with CSRF defenses, authorization, rate limits, idempotency keys, and abuse detection.
- Never fetch reporter-supplied URLs from a privileged network without SSRF protection. Normalize and reputation-check links asynchronously.

### Search and scraping abuse

- Identifier lookup and the provider directory are attractive enumeration/scraping targets. Apply layered IP/account/device rate limits, bot controls, monitoring, response minimization, and explicit API access rules.
- Do not put sensitive matches in autocomplete, analytics events, URLs, browser history, or error messages.

### Integrity and operations

- Statistics should be computed from auditable moderation events, not mutable display records. Define inclusion rules for approved, removed, appealed, duplicate, and corrected reports.
- Keep every moderation change and profile-score change append-only/auditable; separate public display status from legal-retention status.
- Require strong operator authentication, least-privilege roles, step-up authentication for publish/remove/export actions, and two-person review for high-risk bulk actions.

### Do not clone the site

The first-party admin rules explicitly prohibit similar/misleading CheckScam interfaces and domains. Implement the general functional patterns with original information architecture, visual design, copy, and branding; do not reuse the lock logo, verification seal, screenshots, profile copy, or trade dress. Source: [admin rules](https://admin.checkscam.vn/dieu-khoan-admin/).

## Feature parity checklist for Avin

This is the smallest behavior-oriented parity set suggested by the live study:

- Unified normalized lookup across supported identifier types.
- Public warning result with masked identifiers, evidence, disclaimer, provenance, related history, views, sharing, and removal/appeal.
- Three typed submission forms sharing a secure evidence pipeline.
- Moderation queue with duplicate linking, decision reasons, notifications, publication, corrections, appeals, and audit log.
- Public statistics with explicit definitions and snapshot timestamps.
- Provider directory with search/filter and consented public profiles.
- Provider verification/scoring policy that is event-driven and explainable.
- Rate-limited comments with moderation.
- Privacy/redaction, secure uploads, anti-enumeration, and operator RBAC designed in from the start.

## Fit with Avin's current architecture

Avin already has much of the difficult platform infrastructure. The missing capability is a distinct public risk-reporting context; it should not be folded into `Dispute`, `Review`, or Seller Enforcement because those concepts govern transactions that occurred inside Avin.

| CheckScam capability | Existing Avin capability | Recommendation |
| --- | --- | --- |
| Public provider profile | A public Store profile already exposes avatar, description, join date, rating/count, and completed-order count. Public visibility already requires an approved, non-enforced Seller with a complete profile. Sources: [`toPublicStoreProfile`](../../packages/api/src/seller-store/router.ts#L41), [`isStorePubliclyEligible`](../../packages/api/src/seller-store/profile.ts#L84). | Extend the Store presentation only if needed. An approved Seller may receive a clearly defined verification badge, but approval must not be described as a safety guarantee. |
| Public "Admin" directory | Avin has an internal Admin Seller list and public Store routes. Avin's canonical `Admin` term means a platform operator, not a service provider. Sources: [`SellerListPage`](../../apps/admin/src/features/sellers/pages/seller-list-page.tsx#L63), [domain model](../../CONTEXT.md). | Do not copy CheckScam's role name. If a public directory is wanted, make it a Seller directory; introduce `Verified Intermediary` only after its obligations and eligibility are defined. |
| Applicant verification | Avin already has a manual SellerApplication queue, detail review, masked bank display, and approve/change-request/reject decisions. Source: [`SellerApplicationDetailPage`](../../apps/admin/src/features/seller-applications/pages/seller-application-detail-page.tsx#L46). | Reuse SellerApplication as one input to Seller verification; do not expose its private bank/KYC DTO publicly. |
| Evidence upload | Avin already supports authenticated, typed, count/size-limited private DisputeEvidence uploads and a reusable dropzone. Sources: [`createDisputeEvidenceUploadRouter`](../../apps/server/src/uploads/listing-image-upload.ts#L348), [`DisputeEvidenceUploader`](../../apps/web/src/features/commerce/components/dispute-evidence-uploader.tsx#L37). | Reuse the upload pattern and constants, not the Dispute tables. Add quarantine, malware scanning, metadata stripping, redacted public derivatives, and orphan cleanup for report evidence. |
| Moderation and appeal | Avin has Admin decision workflows, immutable enforcement actions, evidence-backed appeals, notifications, and audited sensitive reads. Source: [`reviewSellerEnforcementAppeal`](../../packages/api/src/seller-enforcement/service.ts#L1403). | Reuse the workflow patterns while keeping public-report decisions in their own module and tables. A report appeal must never mutate Seller Enforcement automatically. |
| Comments/reputation | Avin Reviews are authenticated, tied to an OrderItem, immutable, mask the Buyer name, recalculate aggregates, and can be hidden/restored by Admin. Source: [`createReview`](../../packages/api/src/commerce/review.ts#L107). | Do not reuse `Review` for warning comments. Create a separately moderated contribution type, preferably authenticated in P0. |
| Statistics | Avin's Admin overview already aggregates operational counts and 7/30-day financial trends. Source: [`OverviewPage`](../../apps/admin/src/features/dashboard/pages/overview-page.tsx#L40). | Add public approved-report aggregates with documented inclusion rules and `updatedAt`; keep internal queue/abuse metrics Admin-only. |
| App boundaries | Avin deliberately keeps `apps/admin` independent and all business writes behind the API; the Operations console is a cross-domain read boundary rather than a second owner of commands. Sources: [ADR-0002](../adr/0002-independent-admin-app.md), [ADR-0001](../adr/0001-hybrid-supabase-access.md), [ADR-0018](../adr/0018-operations-console-and-notification-boundary.md). | Put public search/submission/detail in `apps/web`, moderation in `apps/admin`, commands/queries in `packages/api`, records in `packages/db`, and byte-transfer endpoints in `apps/server`. Do not place moderation commands in Operations. |

No current Avin symbol was found for a scam-warning or external-risk-report domain. Current search is catalog-oriented. This makes the feature a new bounded context rather than a small extension to an existing table.

## Recommended Avin domain boundary

The following names are provisional until added to Avin's ubiquitous language. Avoid `Transaction Report`, because `Transaction` already means an immutable financial-ledger event in Avin.

### Core records

- `ExternalRiskReport`: the submitted allegation, report kind, narrative, optional claimed-loss amount, submitter identity, acceptance version, timestamps, and publication state.
- `ExternalRiskIdentifier`: one searchable identifier attached to a report, with a type such as bank account, phone, social ID, platform account, or website. Store an encrypted canonical value, a keyed fingerprint for exact lookup, and a masked display value. A report can have several identifiers, and an identifier can appear in several reports.
- `ExternalRiskEvidence`: an immutable private original plus optional moderator-approved, redacted public derivative. Never make the submitted original public by default.
- `ExternalRiskModerationAction`: append-only submit, request-changes, publish, reject, correct, withdraw, and remove decisions with actor, reason, prior/new state, and timestamps.
- `ExternalRiskAppeal`: a separately tracked correction/removal request from the reporter or affected party, with evidence and an auditable outcome.
- `ExternalRiskComment`: an authenticated contribution with a masked public author label and an independent moderation state.
- `ExternalRiskAggregateSnapshot`: optional precomputed daily/monthly/yearly totals derived from moderation events. In P0, indexed SQL aggregation may be enough; add snapshots only if measured load requires them.

Suggested report lifecycle:

```text
DRAFT -> SUBMITTED -> UNDER_REVIEW -> PUBLISHED
                           |          |
                           |          +-> CORRECTED -> REMOVED
                           +-> CHANGES_REQUESTED -> SUBMITTED
                           +-> REJECTED
```

Appeals/removal requests should be separate records rather than overloading the report state. Corrections append history and replace the public projection; they do not erase the original audit record.

### Search design

Start with exact normalized lookup, not name-based fuzzy accusation search:

1. Classify the input without putting it in the URL.
2. Normalize per type: digits for phone/account, canonical host/path for URLs, and platform-specific social IDs.
3. Compute a server-side keyed fingerprint and query indexed `(type, fingerprint)` columns.
4. Return only `PUBLISHED` reports and already-masked projections.
5. Group related reports by the matched identifier without automatically claiming that different identifiers belong to one real person.

PostgreSQL is sufficient for the screenshot-scale counts. Do not add a separate search service until exact lookup latency or richer discovery requirements justify it. Apply IP/account/device limits and never send raw search inputs to analytics.

### Proposed code placement

```text
packages/db/src/schema/external-risk.ts
packages/api/src/external-risk/
  public-query.ts
  submission.ts
  moderation.ts
  appeal.ts
  analytics.ts
apps/server/src/uploads/external-risk-evidence-upload.ts
apps/web/src/features/external-risk/
apps/admin/src/features/external-risk/
```

Candidate public routes are `/safety`, `/safety/report`, `/safety/reports/$slug`, and `/safety/statistics`. Candidate Admin routes are `/external-risk-reports` and `/external-risk-reports/$reportId`. Final route naming should follow an Avin product-language decision rather than CheckScam's branding.

Candidate procedure groups:

- Public: `externalRisk.search`, `externalRisk.getPublished`, `externalRisk.getStatistics`.
- Authenticated participant: `externalRisk.submit`, `externalRisk.listMine`, `externalRisk.submitAppeal`, `externalRisk.addComment`.
- Admin: `externalRiskAdmin.listQueue`, `externalRiskAdmin.getDetail`, `externalRiskAdmin.requestChanges`, `externalRiskAdmin.publish`, `externalRiskAdmin.reject`, `externalRiskAdmin.correct`, and `externalRiskAdmin.remove`.

Every mutation should be idempotent where retries are plausible. Public DTOs must be explicit projections so reporter contacts, private evidence keys, unmasked identifiers, Admin notes, and audit metadata cannot leak through object spreading.

## Recommended rollout

### Phase 0: safe minimum

- Public exact lookup for bank accounts, phone numbers, social IDs, platform accounts, and website hosts.
- Authenticated typed submission with private evidence and a versioned declaration.
- Admin moderation queue/detail with request-changes, publish, reject, correction, removal, and mandatory reasons.
- Published detail page with masked identifiers, approved redacted evidence, provenance, prominent non-adjudication disclaimer, report history, and correction/removal request.
- Reporter and affected-party notifications plus immutable moderation audit.
- Basic approved-only day/month/year statistics labeled as **claimed** loss, with inclusion rules and `last updated`.
- Rate limiting, duplicate detection, evidence quarantine/scanning, redaction, retention, and operator step-up authentication included in the launch gate.

### Phase 1: participation and operations

- Authenticated, rate-limited comments with hide/restore/report actions; do not start with anonymous comments.
- Submitter dashboard, appeal tracking, duplicate linking, moderator workload/age metrics, and abuse monitoring.
- Share metadata generated exclusively from masked public projections.
- Optional external blocklist integrations only after a documented data-sharing contract and retry/audit design.

### Phase 2: provider discovery

- Searchable public Seller directory built from existing public Store profiles.
- A verification badge whose eligibility, expiry, revocation, and appeal rules are documented.
- Consider a recommended transaction ceiling only if Avin has a reviewed policy explaining how it is calculated and what responsibility Avin assumes.
- Defer any numeric trust score/tier until every input event, score change, explanation, and appeal path is defined. A decorative `100/100` score creates more liability than safety.

## Launch gates

Do not publish accusations until all of these are resolved:

- Legal review for the target jurisdictions, including lawful basis, notice, correction, appeal, retention, and law-enforcement requests.
- A field-level disclosure matrix: public, masked, moderator-only, encrypted, retained, and deleted.
- Written evidence standards and moderator runbook for every report kind.
- A redaction workflow that covers page HTML, API JSON, metadata, search indexes, logs, caches, and image derivatives.
- Abuse controls for submission, lookup, comments, sharing, appeals, and bulk operator actions.
- Tests proving unauthorized users cannot read originals or contacts, removed reports disappear from every public projection, statistics reconcile with moderation events, and retries do not duplicate reports or notifications.

## Open questions before implementation

1. Which identifiers may Avin legally collect, search, and publish in its target jurisdictions?
2. Is the provider directory merely informational, or does Avin assume financial/dispute obligations?
3. What constitutes sufficient evidence for each report type, and who makes the decision?
4. What is the correction/appeal SLA, and how is the accused notified?
5. Which fields are public, masked, moderator-only, retained, or deleted?
6. Are anonymous comments necessary, or would authenticated, moderated contributions reduce abuse?
7. Are external blocklist/bot integrations in scope, and under what data-sharing agreement?
8. How are duplicates, conflicting reports, withdrawals, and overturned decisions reflected in search and statistics?
