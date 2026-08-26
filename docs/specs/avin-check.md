# Avin Check: verified provider directory and moderated external transaction warnings

## Problem Statement

Avin users currently lack a single place to verify the official identity and registered payment details of trusted external service providers, search for known external transaction-risk identifiers, and submit evidence-backed warnings. Existing marketplace order, dispute, escrow, and wallet workflows only cover commerce conducted inside Avin and must not be stretched to represent unrelated Facebook, Zalo, website, game, social-account, or bank-transfer transactions.

Avin also needs a controlled way to publish verified provider profiles and administer provider-funded protection limits without presenting those limits as an automatic insurance promise. The real Provider Bond and any discretionary support payment will be handled manually by authorized system operators outside the product. The product must record authoritative state, evidence, approvals, moderation outcomes, and audit history, while never moving money itself.

The P0 outcome is a legally reviewed, invitation-limited protection program embedded in the existing Avin public and administration applications. Its public name is **Avin Check**. Verified participants are shown as **Đối tác Avin**. Internal domain terminology uses `ProtectionProvider`; actual platform operators are shown publicly as **Quản lý hệ thống** and retain the existing `Admin` identity in authorization code.

## Solution

Build Avin Check as a bounded context for external transaction protection, separate from marketplace orders and balances. It contains four coordinated capabilities:

1. A year-round Protection Provider application and manual review workflow.
2. A versioned public provider directory with exact identifier lookup and clear Real/Fake guidance.
3. A public, evidence-backed risk-reporting system for external subjects, with private originals and redacted public derivatives.
4. An internal bond, support-review, policy, audit, and operational-control workspace for authorized Admin roles.

The website records recognized Provider Bond state through immutable adjustments reconciled against off-platform bank evidence. It does not collect, custody, refund, compensate, or transfer funds. A Provider's Recommended Transaction Limit is a public reference and cannot exceed the recognized private Bond. Support is discretionary, manually coordinated, capped at the verified actual loss and the historical limit applicable at transaction time, and only available for eligible direct transactions with the correct Provider.

The program launches only after legal review of custody, fees, identity verification, publication and masking of payment data, report moderation, support wording, retention, and correction/removal rights. If Avin lacks a legally suitable program entity and dedicated custody account, P0 must operate as a no-money pilot and must not recognize live Bond.

## User Stories

1. As a visitor, I want to open Avin Check from the existing Avin website so that I can assess external transaction risk without mistaking it for an Avin marketplace order flow.
2. As a visitor, I want all verified participants to be labelled “Đối tác Avin” so that the public terminology is clear and consistent.
3. As a visitor, I want actual platform operators to be labelled “Quản lý hệ thống” so that I do not confuse them with verified providers.
4. As a visitor, I want a prominent explanation that verification is not a guarantee or automatic insurance so that I can make an informed decision.
5. As a visitor, I want to browse active Đối tác Avin profiles so that I can identify providers available for direct transactions.
6. As a visitor, I want directory results to prioritize active status, identifier relevance, approved service match, and response freshness so that tenure alone does not imply superior trust.
7. As a visitor, I want to search a provider by exact name, Facebook URL or ID, Zalo or phone number, bank or wallet account, or approved service so that I can verify the identity presented to me.
8. As a visitor, I want bank and wallet lookups to use exact matching rather than fuzzy matching so that similar account numbers do not produce unsafe false confidence.
9. As a visitor, I want sensitive search terms excluded from URLs, analytics, autocomplete, and public metadata so that my lookup does not leak private identifiers.
10. As a visitor, I want to see a stable public URL for each provider so that I can revisit and share an authoritative record.
11. As a visitor, I want a provider profile to show the provider's name, avatar, current status, join date, last verification date, official Facebook and Zalo identities, approved services, registered payment accounts, Recommended Transaction Limit, and Real/Fake guidance so that I can check the exact counterparty before transferring money.
12. As a visitor, I want registered payment accounts shown only with the provider's explicit consent and according to the approved disclosure policy so that public verification does not bypass privacy obligations.
13. As a visitor, I want the public profile to carry one “Đã xác minh” badge with a precise non-guarantee meaning so that badges do not create an unsupported ranking or insurance promise.
14. As a visitor, I want withdrawn, suspended, and fraud-removed profiles to remain at their stable URLs with clear historical status so that old links cannot be repurposed to conceal risk.
15. As a visitor, I want published warnings linked from a related provider profile so that I can see material public history before transacting.
16. As a visitor, I want pending reports kept private unless the provider's profile has been suspended or an urgent warning has been explicitly published so that unverified accusations are not presented as conclusions.
17. As a visitor, I want a dedicated exact-identifier lookup for bank accounts, wallets, phone numbers, websites, social identities, and platform account IDs so that I can check a subject even when it is not an Avin Provider.
18. As a visitor, I want public identifiers masked everywhere except where a hostname or social profile URL is itself the warned subject so that unnecessary personal information is not exposed.
19. As a visitor, I want a positive exact-match confirmation without exposing the full private identifier so that a lookup can be useful without publishing the underlying value.
20. As a visitor, I want public statistics to show published risk identifiers, current reports, verified claimed loss, approved reports by day/month/year, providers by status, and last-updated time so that I can understand current program activity.
21. As a visitor, I want statistics to count only published reports and exclude removed reports from current totals while preserving audit history so that public numbers remain explainable.
22. As a visitor, I want to read transaction rules, a safety guide, the provider application guide, and management contact information so that I understand scope and escalation routes.
23. As a reporter, I want to submit a warning without creating an Avin account so that public reporting remains accessible.
24. As a reporter, I want to verify my email with a one-time code and provide private contact information so that moderators can request clarification while reducing anonymous abuse.
25. As a reporter, I want to optionally provide Zalo or phone contact details so that moderators can reach me through a practical channel.
26. As a reporter, I want to choose among bank/wallet/phone scam, malicious or fake website, and social/game/account-taken-back forms so that the questions and required evidence fit the incident.
27. As a bank, wallet, or phone reporter, I want to provide payment proof, conversation evidence, the relevant identifier, claimed loss, and a narrative so that moderators can evaluate the warning.
28. As a malicious-website reporter, I want to provide the URL, violation type, screenshots or video, and a narrative so that moderators can assess impersonation, malware, or fraud risk.
29. As a social, game, or account reporter, I want to provide platform, account ID, ownership or transaction proof, conversation evidence, and a narrative so that moderators can evaluate the account-related claim.
30. As a reporter, I want to save a draft and submit it when complete so that I do not lose a complex evidence package.
31. As a reporter, I want the system to reject unsupported file types, excessive sizes, unsafe files, and invalid upload counts so that evidence storage remains secure.
32. As a reporter, I want to receive email notifications when moderators request changes, publish, reject, correct, or remove my report so that I can follow its outcome.
33. As a reporter, I want to resubmit after a changes request so that an incomplete but legitimate warning can be completed.
34. As a reporter, I want a report with insufficient evidence to remain unpublished rather than be presented as fact so that moderation protects all parties.
35. As a reporter, I want corrections and removals to retain a visible history or tombstone unless law requires deletion so that published records cannot be silently rewritten.
36. As a Provider applicant, I want a distinct Provider identity and workspace even if I already have a buyer or seller account so that external protection records do not inherit marketplace permissions or balances.
37. As a Provider applicant, I want applications available year-round so that I can apply when operationally ready.
38. As a Provider applicant, I want to submit identity verification, proof that I am over 18, at least one year of operating history, official Facebook/Zalo/website presence, free-text services, registered payment accounts, operating evidence, and acceptance of the current policy so that the review is evidence based.
39. As a Provider applicant, I want to see whether my application is pending, requires changes, approved, or rejected and receive an explicit reason for every non-approval outcome so that there is no silent rejection.
40. As a Provider applicant, I want a fresh review tied to my own identity rather than buying or inheriting another person's slot, tenure, profile, badge, or directory position so that verification cannot be transferred.
41. As a Provider, I want to inspect my current private record and public profile from my workspace so that I know what Avin has recognized and published.
42. As a Provider, I want to request a profile revision without editing verified public data directly so that changes undergo the same control as initial verification.
43. As a Provider, I want an existing approved profile version to remain authoritative while a revision is reviewed so that unverified changes do not leak into public search.
44. As a Provider, I want sensitive changes to trigger re-verification so that changed identities, services, or payment accounts do not inherit stale trust.
45. As a Provider, I want to register services using free text that is reviewed and approved by Admins so that my actual scope is represented without an artificial fixed taxonomy.
46. As a Provider, I want only transactions within the approved service wording to be eligible for support so that protection scope is predictable.
47. As a Provider, I want email and Zalo notifications for profile revisions, suspensions, related reports, policy reacceptance deadlines, and withdrawal events so that I can respond in time.
48. As a Provider, I want to request Bond Withdrawal from my workspace so that the 30-day cooling and review process is recorded even though money is returned off-platform.
49. As a Provider, I want my withdrawal frozen while open support or risk matters exist so that unresolved obligations are not bypassed.
50. As a Provider, I want the remaining recognized Bond returned 100% after valid adjustments and obligations, with only the Membership Fee remaining nonrefundable, so that Bond is not treated as revenue or an early-withdrawal penalty.
51. As a Provider, I want a material policy update to be versioned and presented for reacceptance by a stated deadline so that continued participation has explicit consent.
52. As a Provider, I want suspension rather than silent removal when I miss a material reacceptance deadline so that the public state and remedy are clear.
53. As a reported Provider, I want verified notice and 48 hours to respond so that moderators can consider my evidence before reaching a conclusion.
54. As a reported Provider, I want non-response to cause a pending-review suspension rather than an automatic fraud conclusion so that procedural status is not confused with guilt.
55. As an external reported subject, I want moderators to contact me where a reliable contact method exists so that I can provide a response or correction.
56. As a Risk Moderator, I want submitted reports to move through submitted, under review, changes requested, rejected, published, corrected, and removed states so that every moderation decision is explicit and auditable.
57. As a Risk Moderator, I want original evidence to remain immutable, private, and Admin-only so that the source record is preserved.
58. As a Risk Moderator, I want to create separate public evidence derivatives with unrelated personal data redacted, metadata stripped, files validated, and an Avin watermark so that no original storage URL or unnecessary private content becomes public.
59. As a Risk Moderator, I want normalized exact-match Risk Identifiers linked to reports so that duplicate subjects can be grouped without fuzzy bank-account matching.
60. As a Risk Moderator, I want to publish an “under verification” warning early for urgent or multi-victim risk only when the moderation policy permits it so that immediate harm can be reduced without overstating the conclusion.
61. As a Risk Moderator, I want supplemental public submissions to create new moderated reports rather than unmoderated comments so that the P0 warning surface remains controlled.
62. As a Risk Moderator, I want to promote an eligible Provider-related report into an internal Support Review so that support evaluation begins from moderated evidence rather than from a separate public claim system.
63. As a Risk Moderator, I want support eligibility to require the correct Provider, an approved service, a registered payment identity, a lawful direct Facebook or Zalo transaction, sufficient evidence, and the required transaction process so that the Provider Bond is not applied outside its stated scope.
64. As a Risk Moderator, I want impersonator, indirect, GDV, website-operated, agent-deposit, lending, and lower-priority-group transactions excluded from P0 support so that Avin does not create delegated or chained liability.
65. As a Risk Moderator, I want mandatory pre-transaction screen video to show the official profile, transaction box, registered payment information, and Provider confirmation before transfer so that Real/Fake verification is assessable.
66. As a Risk Moderator, I want a missing mandatory pre-transaction video to permit a public warning but block Bond-backed support so that awareness reporting and financial eligibility remain separate.
67. As a Risk Moderator, I want a support recommendation capped at 100% of verified actual loss and the historical Recommended Transaction Limit applicable at the transaction time so that support never exceeds the valid exposure.
68. As a Risk Moderator, I want one reconsideration for new evidence or procedural error so that final outcomes can be corrected without creating an endless appeal loop.
69. As a visitor, I want public Support Outcomes limited to privacy-safe labels such as under verification, ineligible, handled by provider/program, or violation confirmed so that private amounts, receipts, and negotiations remain confidential.
70. As a Protection Manager, I want confirmed intentional Provider fraud to set REMOVED_FOR_FRAUD, remove the Provider from the active directory, and preserve the stable warning URL so that future users remain informed.
71. As a Provider Reviewer, I want to approve, request changes, or reject applications and profile revisions with reasons so that provider publication is controlled and explainable.
72. As a Provider Reviewer, I want each published profile version to be immutable and dated so that searches and historical support checks can identify what was authoritative at a given time.
73. As a Bond Operator, I want to record an immutable Bond deposit adjustment with external bank reference and evidence so that recognized Bond cannot increase without reconciliation.
74. As a Bond Operator, I want the product to record Bond state without initiating or receiving payments so that custody remains outside application code.
75. As a Protection Manager, I want Bond decreases, withdrawals, support deductions, and corrections to require a second authorized person different from the recorder so that no single operator can reduce recognized Bond.
76. As a Protection Manager, I want the public Recommended Transaction Limit blocked from exceeding recognized Bond so that public exposure is always backed by the internal record.
77. As a Protection Manager, I want a Provider's limit lowered or profile suspended when recognized Bond falls below the published limit so that an outdated public limit cannot remain active.
78. As a Protection Manager, I want manual support action and private evidence recorded before an approved Bond Adjustment is applied so that an off-platform outcome has a complete internal trail.
79. As a SUPER_ADMIN, I want distinct Provider Reviewer, Risk Moderator, Bond Operator, Protection Manager, and SUPER_ADMIN capabilities so that duties can be separated beyond the existing coarse Admin role.
80. As a security owner, I want every Avin Check Admin to have two-factor authentication enabled so that sensitive review and bond operations have stronger account protection.
81. As a security owner, I want sensitive reads, writes, downloads, exports, successes, and failures audited with actor, purpose, target, session, IP, time, and outcome so that misuse can be investigated.
82. As a privacy owner, I want a launch-approved disclosure matrix covering public, masked, Admin-only, encrypted, retained, deletable, and legally preserved data so that every field has an explicit handling rule.
83. As a privacy owner, I want retention periods set from legal review rather than hardcoded assumptions so that the implementation follows an approved policy.
84. As an operations manager, I want queues to show age, SLA status, and overdue alerts for provider applications, public reports, Provider responses, and withdrawals so that manual work does not disappear.
85. As an operations manager, I want provider applications reviewed within 6–15 days, public reports first-reviewed within 48 hours, and Provider incident responses due within 48 hours of verified notice so that the service has measurable expectations.
86. As an operations manager, I want administrative exports permission-gated, purpose-recorded, audited, and watermarked so that bulk data use is accountable.
87. As a platform owner, I want public search rate limited so that exact identifier lookup cannot be easily scraped or abused.
88. As a platform owner, I want the initial rollout limited to 10–20 invited Providers even while applications remain open so that operational and legal controls can be proven before expansion.
89. As a platform owner, I want expansion gated on complete Bond reconciliation, no sensitive-data leak, SLA performance, working correction/removal workflows, and tested audit and dual approval so that scale follows control maturity.
90. As a platform owner, I want zero imported profiles, reports, warnings, wording, visual identity, badges, seals, or other data from Checkscam or similar services so that Avin Check remains an original and legally controlled product.

## Implementation Decisions

### Domain boundary and naming

- Avin Check is embedded in the existing public and Admin applications but remains a separate bounded context.
- It must not depend on or mutate marketplace `Order`, `Dispute`, escrow, seller wallet, buyer balance, or checkout state.
- Public product name: **Avin Check**.
- Public participant label: **Đối tác Avin**.
- Internal participant term: `ProtectionProvider`.
- Public operator label: **Quản lý hệ thống**; authorization identity remains `Admin`.
- Provider identity and workspace are distinct from buyer, seller, and Admin roles. A real person may hold another account, but no role inherits Provider permissions or records.
- P0 has no GDV, subagent, delegated reputation, subordinate directory, inherited collateral, or Provider-managed verification network.

### Provider application and profile model

- Applications are open year-round and use `PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, and `REJECTED` with required reasons.
- Approval requires adult identity verification, at least one year of operating evidence, verified official channels, free-text services, registered payment accounts, and acceptance of the current policy version.
- Verification slots, profiles, tenure, directory position, and badges are non-transferable.
- Provider public profile versions are immutable. A pending revision never changes the currently published version.
- Sensitive identity, service, and payment changes require re-verification.
- P0 exposes one non-ranking verified badge. It has no Silver/Gold tiers, trust score, comments, QR verification, or scheduled annual reverification.
- Profile states are `ACTIVE`, `SUSPENDED_PENDING_REVIEW`, `WITHDRAWAL_PENDING`, `WITHDRAWN`, and `REMOVED_FOR_FRAUD`.
- Stable profile URLs persist for withdrawn and removed Providers as historical/tombstone pages.

### Search and disclosure

- Directory lookup supports exact name, Facebook URL/ID, Zalo/phone, bank/wallet account, and approved free-text service.
- Bank and wallet identifiers never use fuzzy matching.
- Sensitive searches must not appear in URLs, analytics events, autocomplete storage, response metadata, HTML metadata, or caches.
- Full registered payment accounts may be public on a Provider profile only with explicit Provider consent and legal approval; unrelated risk identifiers remain masked in all public projections.
- Search results sort by active state, exact relevance, service match, and response freshness. Tenure does not permanently determine order.

### Policy, fees, and recognized Bond

- Policy v1 sets a minimum recognized Provider Bond of 30,000,000 VND and a one-time Membership Fee of 3,000,000 VND.
- There is no recurring fee, profile-text edit fee, or limit-downgrade fee in P0.
- Policy is versioned. Material changes require reacceptance by a deadline; failure causes suspension.
- Provider Bond remains Provider-owned and is not Avin revenue, a wallet balance, marketplace escrow, or an automatic insurance reserve.
- Real funds may use only a dedicated bank account owned by the legally reviewed program entity, never a personal account belonging to a founder or operator.
- If there is no approved entity/custody arrangement, production runs as a no-money pilot.
- The system recognizes Bond only after an external bank reference and evidence have been reconciled.
- `BondAdjustment` is immutable and represents deposit, withdrawal, support, or correction. It records an off-platform event but never moves money.
- An increase requires one authorized Bond Operator and supporting evidence.
- A decrease, withdrawal, support adjustment, or correction requires recording by one authorized Admin and approval by a different Protection Manager.
- Recommended Transaction Limit is public, versioned historically, and cannot exceed recognized private Bond.
- If Bond falls below the published limit, the limit must be lowered or the profile suspended before further public reliance.
- Withdrawal has a 30-day cooling period and freezes for unresolved support/risk matters. After valid adjustments and obligations, the remaining recognized Bond is returned 100% off-platform. Membership Fee remains nonrefundable.

### Risk-report moderation

- An authenticated Buyer or Seller can report through the normal Avin session; reporting requires neither a second email OTP nor 2FA, and account-derived identity remains private outside authorized review.
- P0 presents three CheckScam-familiar entry flows: transaction or transfer scam; fake or dangerous website, application, or profile; and seized or reclaimed digital account. Each permits multiple issues: transaction supports non-delivery, partial or mismatched delivery, payment followed by blocking, failed or damaging service, post-delivery chargeback, intermediary impersonation, and `Other`; account reclaim supports reclaim, missing recovery transfer, lost access, publisher lock or ban, refused warranty, and `Other`; fake surface supports impersonation, phishing, malware, fake shop, fake payment, and `Other`. Selecting `Other` requires a 20–500-character explanation.
- An incident involving an Avin Order begins as a Commerce Dispute. Promotion creates a linked, prefilled Risk Report Draft without asking the participant to resubmit Avin-owned order, chat, payment, delivery, or evidence data; it never publishes automatically, and the participant must still confirm the public narrative, preview the exact public packet, attest, and submit it. External incidents begin through Risk Report intake.
- Each Risk Report represents one incident, records when it occurred or was discovered and whether it remains ongoing, and accepts up to ten repeatable identifiers whose incident roles distinguish accused counterparties, payment destinations, intermediaries, contact channels, listings, reported assets, and impersonated identities. A payment destination enters exact lookup when evidence links it to the incident even if the reporter cannot prove who legally owns it; public wording states only that it received funds in an approved report and never declares its account holder a scammer.
- An identifier presented as representing the accused counterparty or used operationally as its payment destination, contact, listing, store, or fake locator becomes a proposed Risk Subject Identifier and produces a role-labelled Risk Warning after whole-report approval. A report may have several Risk Subject Identifiers and appear from several Risk Warning pages while remaining one globally owned Published Risk Report. A digital account UID involved in an account-reclaim incident instead becomes a required Risk Asset Identifier with a neutral asset-history alert; a genuine identity copied by a fake surface may become an Impersonated Identifier with a neutral impersonation alert. Neither becomes risky or contributes to accused-subject totals, and the reporter does not choose a generic primary identifier.
- Bank transfers require the institution, account number, and account-holder name shown on the payment proof; wallet, social, and platform-account identifiers retain their provider or platform so identical values in different namespaces never collapse into one identity.
- Reporter identity comes from the authenticated account, with no extra verified-phone or step-up requirement. Optional phone or Zalo remains private and is collected only when selected as an additional follow-up channel; the form has no CheckScam-style “Người xác thực” block.
- Reporter involvement distinguishes a buyer, seller, or intermediary who directly participated; an authorized representative supplying the affected person's evidence; and a person who directly observed a fake website, application, or profile. Hearsay or posting for another person without permission cannot produce a publishable report. The form does not ask for a Provider relationship; Avin derives Provider ownership and related conflict signals from the authenticated account.
- Triage derives only from incident/discovery dates and whether the risk remains ongoing. The form asks neither reporter-assigned urgency nor an affected-victim count, and triage never independently permits publication.
- Reporter-facing forms do not collect a free-text title. Risk Warning titles are generated deterministically from the report flow and masked Risk Subject Identifier, such as `Cảnh báo giao dịch với STK 327***940 · VIB`, `Cảnh báo tài khoản Free Fire bị back · UID 12***89`, or `Cảnh báo website giả mạo example.com`. The reporter writes one public narrative of 50–10,000 characters plus an optional private moderator-only note; the system preserves the public wording and automatically redacts private material with visible placeholders, while a Risk Moderator can only approve or reject the whole generated packet.
- An authenticated reporter may own several resumable server-side drafts for different incidents. The selected draft saves on step transitions, debounced field changes, or explicit “save and exit”; retries resume that draft instead of creating another one, and opening a new report never overwrites an existing draft.
- Final submission uses one concise, versioned confirmation: the report is accurate to the reporter's knowledge, the reporter may provide its evidence, and the automatically redacted public packet may be published if Avin approves it. The submit action is labeled **Gửi để Avin duyệt** and does not use threatening liability wording.
- Every report asks whether financial loss occurred using `yes`, `no`, or `unknown`; a positive answer requires Claimed Loss and one or more transaction rows. Each row records required date and amount, currency or crypto asset, payment method, destination, and optional time and transaction reference/hash; VND is the default but not the only supported currency. An approved report labels the total **Số tiền người tố cáo khai** without creating Verified Claimed Loss or aggregating it into verified-loss statistics.
- Submission requires the flow's lookup locator—at least one proposed Risk Subject Identifier for transaction or fake-surface reports, or a Risk Asset Identifier for account-reclaim reports—plus incident time, a guided public narrative of 50–10,000 characters, and the complete type-specific Risk Report Evidence Bundle. Every retained file must finish scanning, the system must generate a safe narrative and at least one safe material Public Evidence Copy, and the reporter must preview the exact public packet before final submission. Incomplete reports remain auto-saved drafts; passing this structural gate does not itself mean the allegation will be published.
- Before submission, a transaction report requires payment proof plus conversation, listing, order, or agreement evidence that connects payment to the incident; a chargeback report instead requires delivery proof plus a reversal or chargeback notice. A fake website, application, or profile report requires an exact fake locator plus a screenshot or video, and any associated loss additionally requires the transaction evidence. An account-reclaim report requires its platform-account UID, purchase or handover proof, evidence the reporter previously controlled the account, and evidence of lost access or recovery; reliable seller or reclaimer identifiers are added when available but are not invented as a submission gate. A failed login or publisher ban alone is insufficient, and file count alone never establishes sufficiency.
- A reporter acting for another victim confirms permission to provide the report and evidence. Avin does not collect the victim's contact by default; authorized moderation requests contact or authority evidence only when verification genuinely requires it.
- P0 evidence accepts JPEG, PNG, WebP, and PDF up to 20 MB each, plus at most two MP4 or WebM videos up to 100 MB each, within a ten-file report total. TXT, DOCX, and archive files are excluded; videos remain private originals and the system derives redacted still frames for public evidence.
- Evidence UI and status distinguish upload allowlist validation from completed malware scanning; MIME, extension, and size checks alone never mark a file clean.
- Automatic redaction uses known private fields and text patterns for narrative, OCR plus masking and metadata removal for images/PDFs, and extracted still frames for private video originals. If it cannot produce a safe narrative and at least one material public evidence projection, final submission remains disabled and the reporter must crop, revise, remove, or replace material in the draft; the moderator never edits it.
- An idempotent retry never creates a second report. A repeated submission by the same reporter for the same incident resumes the existing report; the same reporter may file a genuinely new incident about the same identifier, and reports from different reporters remain independently owned and publishable. Backend clustering stays private until Published Risk Reports appear together on the Risk Warning.
- The reporter flow uses four accessible, auto-saving steps: report type/issues and reporter role; transactions, subject identifiers, and timeline; public narrative, private note, and evidence; then exact public/private review and submit. Report types are selected with three cards rather than nested tabs; Back preserves state.
- A transaction backed by a bill requires its calendar date while time remains optional. Account reclaim requires purchase or handover date and lost-access date, both of which may be approximate; a fake surface requires an exact or approximate discovery date. No flow asks for reporter-assigned urgency.
- Each selected evidence file has a preview or type icon, name, size, evidence kind, a short explanation of what it proves, progress, scan status, retry, and removal control. A checklist shows every missing item in the flow-specific Risk Report Evidence Bundle, and **Gửi để Avin duyệt** remains disabled until that bundle is complete.
- Evidence uploads attach immediately to the current Risk Report Draft. The reporter may continue editing or save and exit during processing, while final submission waits for the complete flow-specific evidence bundle, every retained file to finish scanning, and at least one generated Public Evidence Copy that the reporter has previewed.
- Submission freezes an immutable Risk Report Revision. The reporter cannot edit while it is under review; any later correction is a separate post-publication correction flow, while all prior narrative, identifier, fact, and evidence selections remain in the audit history.
- The review step shows the exact system-generated public packet—title, Public Report Source, automatically redacted narrative, Public Risk Identifiers, and Public Evidence Copies—beside private moderator-only material. The reporter accepts the whole packet; there is no per-file publication permission, moderator rewrite, or moderator redaction tool.
- Every Published Risk Report contains at least one system-generated Public Evidence Copy that materially supports its allegation. Bank, wallet, and phone values display the first and last three characters around `***`; account-holder names retain earlier parts and reduce the final name to an initial; email keeps a short prefix and full domain. Institutions, platforms, app package IDs, and reported social/profile UIDs remain full. A dangerous web locator displays its full domain and only a safe path when needed, always strips query and fragment data from the public projection, and renders as non-clickable text.
- Bank is optional during lookup: supplying it narrows exact matching, while an account-number-only search checks every institution and groups matches by bank. Exact private lookup confirms a match without echoing the stored full sensitive value; an account-holder or person's name may support a bank-account match but is never searchable by itself. Every lookup result explicitly distinguishes an accused-counterparty Risk Warning, neutral Risk Asset Alert, or neutral Impersonation Alert.
- A Risk Warning aggregates only one exact normalized Risk Subject Identifier namespace and value; a Risk Asset Alert and Impersonation Alert use the same exact-key rule but remain separate neutral result types. P0 never merges people or identifiers from matching names or fuzzy similarity. Co-occurrence in one Published Risk Report creates cross-links without asserting shared ownership. Each page lists the newest independently Published Risk Reports with source, incident date, Claimed Loss, narrative, Public Evidence Copies, and Risk Subject Response; submissions, rejections, retries, revisions, and repeated copies of one incident never increase the count, and the UI never labels it as a victim count.
- External CheckScam, ChongScam, or similar records never become Avin-native Risk Reports or contribute to Avin statistics. Any future external lookup remains a separate, provenance-labelled source and cannot carry an Avin-approved presentation without passing Avin's own submission and moderation process.
- Field validation appears next to the affected control and in a final error summary. Upload and submit retries retain the same draft and use idempotency; removing evidence or deleting a draft schedules its private storage object for cleanup rather than stranding bytes.
- A successful submission shows the report reference, `SUBMITTED` status, the 48-hour first-review target, and a Risk Report Workspace link without promising publication, a scam verdict, support, or compensation. P0 does not expose a reporter-side change-request loop: incomplete or unsafe submissions are fixed before sending, and a moderator either approves or rejects the submitted packet.
- Shared lifecycle: `DRAFT` → `SUBMITTED` → optional internal `UNDER_REVIEW` → `REJECTED`/`PUBLISHED`; published reports may become `CORRECTED` or `REMOVED`. `UNDER_REVIEW` is an assignment/compatibility state, not a third moderation outcome shown to reporters or moderators.
- Evidentiary quality, ambiguity, unclear linkage, fabricated or irrelevant evidence, inability to link the incident to any publishable lookup result, or out-of-scope material results in terminal `REJECTED`; a genuinely new incident may still use a new report.
- Evidence scanning remains a file-level processing state rather than another report lifecycle state. `UNDER_VERIFICATION` is not a P0 private or public report status.
- A report without sufficient evidence cannot be published.
- Original evidence is immutable, private, and Admin-only.
- Public evidence is a system-generated derivative that removes unrelated PII and metadata, passes file/malware validation, carries an Avin watermark, and never discloses the original storage URL.
- `RiskIdentifier` normalizes bank, wallet, phone, website, social, listing, and platform-account values with namespace and incident role. A published Risk Subject Identifier participates in accused-counterparty lookup, while a published Risk Asset Identifier or Impersonated Identifier participates only in its neutral role-specific lookup result.
- Sensitive identifiers are stored full only in approved private storage and are masked in every public projection.
- The 48-hour first-review target is non-guaranteed. An identified Avin account or Protection Provider receives one evidence-backed response opportunity during a separate 48-hour private window that starts only once the report is otherwise publication-ready. The subject sees only the proposed system-generated public packet, never reporter identity or contact, originals, private notes, abuse signals, or moderator notes. A material replacement revision to the narrative, Risk Subject Identifiers, or Public Evidence Copies resets the window while retaining the prior response for audit; typo and formatting corrections do not. The system generates the response's redacted public projection, the same Risk Moderator approves or rejects it with the report, and non-response does not imply admission. An external subject without reliable contact may claim the relevant identifier and seek correction after publication.
- One authorized Risk Moderator approves or rejects the complete generated public packet in P0; an approved report carries the public badge **Đã duyệt đăng**, never “Đã xác minh scam” or “Scammer.” There is no second publication approver, moderator-authored public summary, per-claim public finding, or public “under verification” state.
- The moderation surface exposes only **Không duyệt** and **Duyệt đăng** during initial review. Rejection requires a private internal reason; publication adds no moderator-authored public reason, and a later correction or removal exposes only a public-safe reason. The surface displays the exact generated public packet and provides no editor for its title, narrative, identifiers, or evidence copies.
- P0 has no public comments.
- P0 has no reactions or votes. Another person with independent incident evidence creates a separate Risk Report; the original reporter adds post-publication context only through a correction/addendum revision, and the subject uses Risk Subject Response or correction.
- Corrections/removals append public history and retain a tombstone unless law requires deletion.
- A reporter may delete a draft. After submission the reporter may only request withdrawal, and an authorized moderator may retain the record when community risk remains; a published report cannot be directly deleted by its reporter.
- A reported subject or authorized representative gets one evidence-backed correction request after proving ownership of the relevant identifier. Any Risk Moderator, including the original reviewer, may decide it in P0; approval appends public correction/removal history rather than silently editing content.
- Inactive drafts are removed after 90 days, rejected or withdrawn originals after one year, and published originals remain while the Risk Warning is active plus three years after removal. Public correction history and tombstones remain long-lived unless law requires deletion.
- Reporter notifications use in-app delivery and verified account email for submission, publication, rejection, withdrawal/correction, and subject-response events. Zalo and phone remain manual optional follow-up channels in P0.
- Abuse controls rate-limit by account, IP, and device and privately detect reused file hashes, linked accounts, brigading, and extortion without exposing those signals publicly.
- Deliberately fabricated evidence, brigading, extortion, or repeated reporting abuse may cause one Risk Moderator to apply a 30-day Risk Reporting Restriction with a mandatory reason. It blocks new or revised reports while preserving login, history, responses, and correction access; the account may request one review, and later misconduct may receive another 30-day restriction. P0 has no escalating duration ladder. The restriction does not automatically alter Seller Enforcement, Protection Provider standing, or Bond; those require separate authorized decisions.
- A full or partial refund, replacement, or other resolution appends a dated public outcome without deleting the incident or its history. Publication does not automatically suspend a Seller or Provider, change Bond, or open Support Review; a Risk Moderator may initiate those independent workflows when their own requirements are met.
- Production search engines may index Risk Warning, Risk Asset Alert, Impersonation Alert, and Published Risk Report pages containing generated titles, domains, safe paths, app package IDs, social/profile UIDs, and masked identifiers. URL query and fragment data, full payment identifiers, phone, email, private narrative, original evidence URLs, and private values are excluded from HTML metadata, sitemap payloads, analytics, and other indexable projections.
- Production publication remains disabled until actual malware scanning, automatic redaction, reporter public preview, subject response/correction, retention cleanup, Risk Reporting Restriction, and moderator review surfaces work end to end. Private draft and submission testing may run earlier behind a launch gate.
- Only `PUBLISHED` reports count current report totals. P0 does not publish an aggregate verified-loss total; removed reports remain in audit but leave current totals.

### Support review and off-platform handling

- P0 has no public Claim object or claim form. A Risk Moderator may promote an eligible Provider-related report into a private `SupportReview`.
- Eligibility requires the correct Provider, approved service, registered payment identity, lawful direct Facebook/Zalo transaction, sufficient evidence, and the required process.
- Fake/impersonator, indirect, GDV, website-operated, agent-deposit, lending, and lower-priority group transactions are excluded.
- Where policy requires it, pre-transaction screen video must show the official profile, transaction box, registered payment information, and Provider confirmation before transfer.
- Missing mandatory video can still support a public warning but not Bond-backed support.
- Support is procedural and discretionary, not guaranteed compensation.
- Maximum support is the lesser of 100% verified actual loss and the historical Recommended Transaction Limit at transaction time.
- Admins coordinate contact and any real payment outside the website. The internal result, evidence, recorder, approver, and external reference are retained.
- Support changes recognized Bond only through an approved immutable Bond Adjustment.
- One reconsideration is allowed for new evidence or procedural error.
- Public outcomes use privacy-safe labels only and omit amount, receipts, private discussion, and payment method.
- Confirmed intentional fraud sets `REMOVED_FOR_FRAUD`, removes the Provider from the active directory, and preserves the stable warning page.

### Administration, authorization, and operations

- Add protection-specific capabilities for `PROVIDER_REVIEWER` and `RISK_MODERATOR`; `SUPER_ADMIN` retains the narrowly audited P0 operations that are not delegated. P0 has no separate `BOND_OPERATOR` or `PROTECTION_MANAGER` role.
- Every protection Admin operation requires 2FA and a role-appropriate audited API boundary.
- Audit sensitive read, write, download, export, success, and failure with actor, purpose, target, session, IP, time, and outcome.
- Before launch, approve a field-level data disclosure and retention matrix.
- Operational SLA: Provider application review within 6–15 days; public report first review within 48 hours; Provider response within 48 hours after verified notice.
- Reporter notifications: changes requested, published, rejected, corrected, removed.
- Provider notifications: profile revision, suspension, related report, policy deadline, withdrawal.
- Admin queues show age and overdue alerts.
- Public statistics include published risk identifier count, current Published Risk Report count, approved reports by day/month/year, Providers by status, and last updated time. P0 publishes neither an aggregate verified-loss total nor a victim count, and it has no public comments.
- Public search is rate limited. P0 has no public API, bulk public export, Telegram/Discord bot, or advertising surface.
- Admin export requires explicit permission, purpose, audit, and watermark.

### Delivery and launch gates

- Public P0 screens: Provider directory, Provider profile, exact identifier lookup, three report forms, warning detail/history, statistics, transaction rules, safety guide, application guide, and contact management.
- Provider P0 screens: application, workspace, revision request, and withdrawal request.
- Admin P0 screens: application queue, Provider/profile revision, Bond adjustment/approval, report moderation, Support Review, policy versions, and operational statistics.
- Legal review is a hard launch gate before recognizing real Bond or publishing accusations.
- Pilot approval is invitation limited to 10–20 Providers; applications may remain open but new approval volume is controlled.
- Scale only after 100% Bond reconciliation, no sensitive leak, SLA compliance, proven correction/removal, and validated audit/dual approval.
- Do not import data or copy identity, wording, UI, badges, seals, or records from Checkscam or any similar service.

## Testing Decisions

Testing should target the highest existing seams: public API contracts, Provider-authenticated API contracts, and Admin-authorized audited API contracts. UI tests should prove role-aware rendering and critical user paths without coupling to internal component structure.

### Domain and persistence tests

- State-machine tests cover every allowed and forbidden Provider application, profile, report, withdrawal, Support Review, and Bond Adjustment transition.
- Invariant tests prove Recommended Transaction Limit never exceeds recognized Bond, public profile versions are immutable, pending revisions do not alter the published version, and support uses the historical limit effective at transaction time.
- Concurrency tests prove duplicate approvals, withdrawals, profile publications, and Bond adjustments are idempotent and cannot double-apply.
- Dual-control tests prove the recorder cannot approve their own Bond decrease, withdrawal, support adjustment, or correction.
- Identity tests prove Provider permissions remain distinct from buyer, seller, and Admin permissions.
- Policy tests prove material policy versions require reacceptance and missed deadlines suspend rather than delete.

### Public API and privacy tests

- Contract tests cover directory filtering/sorting, stable profile URLs, exact identifier lookup, masked results, public warning history, and statistics.
- Negative tests prove fuzzy bank/wallet matching is unavailable and near-match identifiers never produce a positive result.
- Privacy tests inspect response bodies, headers, URLs, HTML metadata, cache keys, logs, analytics payloads, and autocomplete persistence for sensitive lookup leakage.
- Tombstone tests prove withdrawn, corrected, removed, and fraud-removed records retain the correct stable public history.
- Statistics tests prove only published/current records are counted and verified claimed loss is labelled accurately.
- Rate-limit tests cover abusive exact-search and report-submission patterns without blocking normal use.

### Reporter and evidence tests

- End-to-end API tests cover authenticated Buyer and Seller reporting, all three report forms, draft/save/submit, changes requested/resubmit, publish, correct, reject, and remove.
- Evidence tests cover count, size, allowed content type, malicious file rejection, metadata stripping, unrelated PII redaction, watermarking, signed access expiry, and prevention of original storage URL disclosure.
- Authorization tests prove reporters cannot access private originals, internal moderation notes, private identifiers, or another reporter's contact data.
- Notification tests prove every required reporter status event is delivered idempotently and records failures for retry.

### Provider-authenticated API tests

- Contract tests cover application, workspace read, revision request, policy acceptance, incident response, and withdrawal request.
- Authorization tests prove Providers cannot directly publish a profile, edit approved data, change recognized Bond, approve adjustments, access reporter contact, or view original evidence without explicit role permission.
- Revision tests prove the existing version stays public until a reviewer publishes a new immutable version.
- Withdrawal tests prove the 30-day cooling period, unresolved-matter freeze, status transitions, and off-platform-only semantics.
- Notification tests cover revision, suspension, related report, policy deadline, and withdrawal events across email and configured Zalo delivery.

### Admin-authorized API tests

- Role-matrix tests cover positive and negative access for Provider Reviewer, Risk Moderator, Bond Operator, Protection Manager, and SUPER_ADMIN.
- 2FA tests prove protection Admin procedures reject otherwise valid Admin sessions without completed two-factor authentication.
- Audit tests prove sensitive reads, writes, downloads, exports, successes, and failures record actor, purpose, target, session, IP, time, and outcome.
- Moderation tests cover required evidence, Provider notice, 48-hour response, suspension without automatic guilt, urgent under-verification publication, correction, removal, and historical append-only behavior.
- Support tests cover eligibility and exclusion rules, missing mandatory video, historical limit cap, one reconsideration, privacy-safe public outcome, and Bond adjustment linkage.
- Bond reconciliation tests prove no recognized increase without external reference/evidence and no application path initiates a real transfer.
- Export tests prove permission, purpose, audit entry, watermark, and field-level disclosure limits.

### UI and operational tests

- Public UI tests cover accessible navigation, directory search, masked identifier confirmation, Provider status warnings, report forms, and warning history on mobile and desktop.
- Provider UI tests cover accessible application, revision, policy acceptance, incident response, and withdrawal flows.
- Admin UI tests cover queue aging, overdue alerts, decision reasons, evidence comparison, dual approval, and prevention of unauthorized controls.
- Accessibility tests cover semantic headings, labels, keyboard operation, focus management, error summaries, and non-color status indicators.
- Operational tests simulate SLA aging, notification retry, audit lookup, recovery after partial external reconciliation, and correction/removal requests.
- Launch verification includes a no-money pilot path, a legally enabled Bond path, and a configuration guard proving real-Bond recognition cannot activate without the legal/custody gate.

## Out of Scope

- Any in-app payment, custody, wallet, escrow, refund, reimbursement, or payout.
- Any connection to marketplace Order, Dispute, checkout, escrow hold, SellerWallet, or Buyer balance.
- GDV, subagents, delegated trust, subordinate Provider networks, Provider-run verification directories, inherited collateral, or mini-Checkscam models.
- Buying, selling, transferring, inheriting, or restoring verification slots or historical tenure.
- Claims submitted independently from a moderated public Risk Report.
- Automatic compensation, 200% support, pooled multi-group allocation, or a public promise of insurance.
- Silver/Gold tiers, numeric trust score, public comments, profile QR codes, or annual scheduled reverification.
- Public API, bulk public export, Telegram/Discord bots, advertising, or promotional network distribution.
- Support for impersonator/Fake transactions, indirect or chained transactions, GDV activity, Provider-managed websites, agent deposits, lending, or transactions outside approved services and identities.
- Importing Checkscam data or copying its brand, UI, badges, seals, text, policy wording, or identity.
- Hardcoded long-term retention periods before legal approval.

## Further Notes

- This is a high-risk trust, privacy, moderation, and financial-administration feature. Legal review is a dependency, not a post-launch cleanup item.
- Public copy must consistently distinguish: verified identity, Recommended Transaction Limit, claimed loss, verified actual loss, warning under verification, confirmed violation, and discretionary support.
- The 30,000,000 VND minimum Bond and 3,000,000 VND Membership Fee are policy-v1 configuration, not unchangeable domain constants. Historical policy/version linkage must remain queryable.
- The implementation should reuse existing architectural seams for manual review, audited Admin procedures, two-factor enforcement, private evidence upload, signed access, immutable enforcement history, notification delivery, and public/admin application separation.
- Business writes remain behind typed server APIs. The Admin application is an operations console and must not become a direct database mutation boundary.
- Before pilot approval, prepare moderation playbooks, Real/Fake guidance, a data disclosure matrix, custody reconciliation procedure, incident response, correction/removal procedure, and an operator training checklist.
- Exit criteria for P0 are functional workflow coverage, complete authorization and audit coverage, verified privacy projections, successful no-money pilot operation, and explicit legal approval before any real Bond recognition or public accusation workflow is enabled.
