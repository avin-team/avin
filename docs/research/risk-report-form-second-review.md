# Second review: Avin risk-report form

> **Superseded product direction.** This research snapshot used a generic fraud-intake model that Avin rejected for its Vietnam MMO market. Do not implement its guest intake, optional evidence, private-only narrative, moderator summary, or category-removal recommendations. The current decisions live in [`CONTEXT.md`](../../CONTEXT.md), [`docs/specs/avin-check.md`](../specs/avin-check.md), and ADRs 0036–0042.

_Reviewed 2026-08-25. Scope: core intake UX, evidence, privacy/publication, moderation, and the current implementation. This is product research, not legal advice._

## Executive decision

The incident-based model is sound, but the current proposal makes the full report do too many jobs. P0 should have two distinct intake paths:

1. **Quick signal (guest):** report one suspicious locator in 1–2 minutes; no files, no account, never published directly.
2. **Full incident report (authenticated):** a private case with structured facts, optional evidence, follow-up, and a possible moderator-produced public warning.

Four prior decisions should be reversed for P0:

- **Do not publish a reporter narrative**, even after redaction. Keep it private for moderation.
- **Do not require an evidence file to submit.** Evidence raises confidence and may be required for publication, not intake.
- **Do not ask users to choose one of three canonical report types.** Ask what happened/outcome and derive the internal taxonomy.
- **Do not ask users to choose a “primary identifier.”** Let them add all known locators; Avin derives the lead identifier.

The existing four steps can remain as four conceptual sections, but not as four fixed, overloaded screens. Branching should determine the actual number of question pages.

## Evidence and inference boundary

- **Source fact** means a directly observed property of an official form or official guidance, linked inline.
- **Inference** means what that evidence suggests for Avin; it is not a claim that Avin has the same legal or operational obligations.
- **Recommendation** is the P0 product decision proposed here.

The local baseline reviewed was the [current product specification](../specs/avin-check.md), [domain vocabulary](../../CONTEXT.md), [form implementation](../../apps/web/src/features/protection/pages/risk-report-page.tsx), [submission validation](../../packages/api/src/protection/risk-report.ts), [report service](../../packages/api/src/protection/risk-report-service.ts), and [database schema](../../packages/db/src/schema/protection.ts).

## P0 decision table

| Current/proposed decision | Verdict | P0 decision |
| --- | --- | --- |
| One incident is the private source record | **Keep** | A report describes one incident and may contain many subject locators and transactions. Do not make an identifier the report itself. |
| Authenticated users only | **Narrow** | Require authentication for a full report/workspace, but accept a private guest quick signal. Preserve entered data across just-in-time sign-in. |
| Three user-facing types: financial scam, website/app violation, account takeover | **Remove** | Ask outcome(s): sent/lost money or value; lost account access; found a suspicious site/app/link; other/not sure. Store channel and scheme separately and derive internal routing. |
| One “primary” plus related identifiers | **Remove from UX** | Use a repeatable “Thông tin đối tượng đã sử dụng” group. Avin selects the lead identifier for search/public display. |
| Reporter roles: direct, representative, observer | **Keep and branch** | Change dates, loss, authority, and help text by role; do not show victim fields to an observer by default. |
| At least one file required to submit | **Reverse** | Files are optional at intake. Structured locators, transaction references, URLs, and platform/bank case IDs also count as evidence. |
| Final submit waits for one `CLEAN` file | **Reverse** | Accept the report while files are quarantined/processing. Block staff preview and publication until scanning succeeds. |
| Evidence checklist exposes submission and publication thresholds | **Narrow** | Tell reporters what is required to send and what would help verification. Keep publication rules in moderator tooling. |
| Reporter narrative becomes a redacted public narrative | **Reverse** | Narrative remains private in P0. Public output is structured, verified facts only; no rewritten “public summary.” |
| Private original plus separate public derivative | **Keep** | A public asset is an explicit, separately approved derivative. Never expose or transform the original on request-time. |
| Cross-reporter duplicates remain independent | **Keep** | Never reveal another person's report. Link duplicates privately and aggregate only at the public-warning layer. |
| No duplicate warning in the reporter flow | **Narrow** | For the same signed-in user and a recent exact incident, offer to resume; make retries idempotent. Do not disclose cross-user matches. |
| Four-step wizard | **Narrow** | Keep four section labels, but use conditional question pages/logical groups, persistent back navigation, and saved state. |
| 48-hour review promise | **Narrow** | Show only a measured, staffed target; otherwise state the next event and how Avin will contact the reporter. |

## Why the reversals are necessary

### 1. Split guest signal from authenticated report

**Source facts.** The official Microsoft unsafe-site guest form accepts a URL and threat classification without an account or upload. The FTC accepts reports about scams people have merely spotted and lets them provide as much or as little contact information as they choose. GOV.UK advises against creating accounts when a service can work without them because account creation is a drop-off point; if an account is necessary, users should be allowed to progress before being asked to create it. ([Microsoft](https://www.microsoft.com/en-us/wdsi/support/report-unsafe-site-guest), [FTC](https://consumer.ftc.gov/media/how-report-fraud-reportfraudftcgov), [GOV.UK account pattern](https://design-system.service.gov.uk/patterns/create-accounts/))

**Inference.** A suspicious URL/account tip and an incident case have different trust, follow-up, publication, and moderation needs. Treating them as one object either overburdens a useful tip or gives an anonymous allegation too much authority.

**Recommendation.** Create a private `RiskSignal` intake for guests and retain authenticated `RiskReport` for case management. A signal may prefill a full report after sign-in, but cannot itself become a public warning, count as a verified incident, or receive a review SLA.

### 2. No public reporter narrative in P0

**Source fact.** In August 2026, the CFPB stopped discretionary publication of complaint narratives and visualizations, citing the one-sided and unverified nature of allegations, possible confusion, and reputational harm, while retaining private collection and agency use. Historically, even its opt-in narratives were scrubbed and supporting documents stayed private. ([CFPB cessation notice](https://www.consumerfinance.gov/about-us/newsroom/the-cfpb-to-cease-discretionary-publication-of-complaint-narratives-and-visualizations/), [CFPB historical data-use policy](https://www.consumerfinance.gov/complaint/data-use/))

**Inference.** Redaction removes personal data; it does not fix accuracy, balance, evidentiary context, or defamation risk. Avin moderation reduces but does not eliminate those risks. A moderator rewriting the narrative also adds time and can accidentally change meaning.

**Recommendation.** Keep the reporter's wording private. P0 public pages should use deterministic labels and moderator-verified structured facts only. Reconsider excerpts later only with explicit legal/product criteria, necessity, fact verification, reporter permission, a subject response/correction path, and a complete audit trail.

### 3. Evidence must not gate submission

**Source facts.** IC3 accepts detailed complaints but does not accept attachments with the form; reporters retain originals and may be contacted later. The FTC and Microsoft flows accept actionable reports without file uploads. ([IC3 FAQ](https://www.ic3.gov/Home/FAQ), [IC3 complaint form](https://complaint.ic3.gov/), [FTC](https://consumer.ftc.gov/media/how-report-fraud-reportfraudftcgov))

**Inference.** Requiring a screenshot or bill excludes legitimate reports where evidence was deleted, resides on another device, or is better represented by a URL, transaction hash, recipient account, or case reference. Intake completeness and publication confidence are separate thresholds.

**Recommendation.** Allow submission without a file when the report has an actionable locator and incident facts. Files, structured transaction data, and external case references increase confidence. Publication can require corroboration appropriate to the claim.

Uploads must be quarantined. OWASP says extension/MIME/signature checks are insufficient by themselves and recommends storage isolation, randomized names, malware/sandbox checks, authorization, size limits, and content disarm/reconstruction where applicable. ([OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)) A pending scan should not block sending the case; it should block staff consumption and publication.

### 4. Outcome first; taxonomy and lead identifier are internal

**Source facts.** FTC intake branches from what occurred and then asks payment, date, first-contact channel, subject information, and narrative. IC3 similarly separates complainant role, transactions, subjects, and incident description, and allows unknown subject details to be skipped. ([FTC](https://consumer.ftc.gov/media/how-report-fraud-reportfraudftcgov), [IC3 form](https://complaint.ic3.gov/))

**Inference.** “Financial scam,” “website violation,” and “account takeover” overlap: one incident may involve all three. Requiring a canonical choice causes misclassification and hides novel cases. Users also do not reliably know which locator is analytically “primary.”

**Recommendation.** Collect outcome as multi-select with “other/not sure,” plus separate channel and optional scheme. Accept repeatable locators with their namespace/provider; derive report type, routing, and lead identifier after submission.

## Revised P0 end-to-end flow

### Path A — Quick signal (guest, target 1–2 minutes)

1. Safety preface: Avin is not emergency response or account recovery. If money was just sent, contact the bank/payment provider and police; for a hacked account, use the platform's official recovery flow. Official guidance likewise directs urgent cases to local law enforcement, and Facebook routes compromised accounts through its recovery flow. ([IC3 FAQ](https://www.ic3.gov/Home/FAQ), [Facebook account recovery](https://www.facebook.com/help/1216349518398524/))
2. Ask for the suspicious locator and why it seems risky.
3. Optional context and follow-up email.
4. Anti-abuse check, submit, and show a reference plus an invitation to create a full report.

Guest P0 fields:

- **Required:** locator type; locator value; provider/institution/platform namespace when ambiguous; reason (`phishing`, `malware`, `impersonation`, `payment solicitation`, `account takeover`, `other`, `not sure`).
- **Optional:** date spotted (`today`, approximate, or unknown); where it was found/channel; note up to about 1,000 characters; email for follow-up.
- **System-only:** normalized locator, provenance, timestamp, rate-limit/anti-bot signals, and private cluster linkage.
- **Explicitly absent:** files, victim identity, loss amount, public consent, publication promise, and verification status.

### Path B — Full incident report (authenticated)

Use four section labels, but let branching produce smaller question pages:

1. **What happened:** involvement, outcomes, occurrence/discovery date, ongoing state, and first-contact/discovery channel.
2. **Who and where:** repeatable subject locators; conditional transaction rows; optional platform/bank/police reference.
3. **Details and evidence:** private guided narrative, optional technical details, optional uploads with visible processing status.
4. **Check and send:** public/private preview, change links, separate attestations, and submit.

GOV.UK recommends asking only necessary questions, making optional items explicit, permitting “do not know” where valid, and using branching. W3C recommends logical groups, skippable optional stages, progress indication, and saved state; the GOV.UK review pattern requires prefilled change links that return to the review page. ([GOV.UK form structure](https://www.gov.uk/service-manual/design/form-structure), [question pages](https://design-system.service.gov.uk/patterns/question-pages/), [W3C multi-page forms](https://www.w3.org/WAI/tutorials/forms/multi-page/), [check answers](https://design-system.service.gov.uk/patterns/check-answers/))

Full-report P0 fields:

- **System-provided:** user/report ID, verified account email, policy version, timestamps, save status.
- **Required common:** involvement (`direct`, `authorized representative`, `observer`); outcome multi-select plus `other/not sure`; incident date for direct/representative or discovery date for observer, with approximate/unknown; ongoing yes/no/not sure; first-contact/discovery channel; at least one repeatable subject locator; private guided narrative; factual attestation.
- **Conditional:** representative authority attestation; loss (`yes/no/not sure`); when yes, at least one transaction row containing amount, currency, date/approximate date, payment method, and recipient locator/institution. Calculate the total and ask for confirmation; transaction/hash/reference is optional.
- **Optional:** displayed subject name; scheme tag; additional locators; other affected people as a range/unknown rather than a required exact count; technical details; evidence files; bank/platform/police case reference; preferred safe contact channel; additional note.
- **Separate controls:** acknowledgment of the privacy notice is not the same checkbox as “true to the best of my knowledge” or authority to provide evidence.

Do not enforce a 50-character narrative when structured facts are already actionable. Give prompts (“what happened, when, how you were contacted, what happened next”) and a reasonable maximum instead. Phone/Zalo/name should be optional and collected only when needed for follow-up. Official data-design guidance requires necessity, purpose limitation, proportionate retention, and clear notice of unexpected/public uses; Vietnam's official personal-data rules express the same minimization and purpose principles, subject to counsel review under the current legal framework. ([GOV.UK personal information guidance](https://www.gov.uk/service-manual/design/collecting-personal-information-from-users), [Vietnam Decree 13 text](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-13-2023-nd-cp-bao-ve-du-lieu-ca-nhan-119230516104357809.htm))

### Save, resume, duplicate, and confirmation

- Save after each completed question page and debounce long narrative edits; display “Đã lưu.” Preserve browser-back state. Allow multiple drafts for different incidents.
- Require sign-in when the user chooses save, upload, or submit—not before they can understand and begin the form. Return them to the exact question after authentication. ([GOV.UK save-progress guidance](https://www.sign-in.service.gov.uk/documentation/design-recommendations/save-progress))
- Use an idempotency key for submit/retry. For a recent exact draft/report owned by the same user, offer “continue existing report.” Never reveal another reporter's match.
- Confirmation must show a human-readable reference, received/processing status, saved or downloadable answers, what happens next, realistic timing, contact route, and urgent recovery links. This matches the official confirmation-page pattern. ([GOV.UK confirmation pages](https://design-system.service.gov.uk/patterns/confirmation-pages/))

## Public-output policy for P0

A public warning is a moderated output, not the reporter's submission. It may contain only:

- deterministic title from outcome + masked/normalized lead locator;
- verified outcome/category and channel;
- masked identifiers plus provider/institution/platform/domain where useful;
- incident day or date range when safe;
- verified loss, separately labeled from claimed loss;
- verification/status label and last-reviewed date;
- subject response, correction, appeal, and change history when applicable.

It must not contain the reporter's narrative, reporter identity/contact, raw evidence, unverified victim count, or automatically generated prose. A redacted image/PDF derivative is optional and should be published only when necessary to understand the warning, after malware clearance, manual review, cropping/blur, and a separate approval action. Originals remain private and follow an explicit retention/deletion schedule; “private” must not mean “retained forever.” Guest signals should have a shorter retention window than active full reports.

Multiple independent reports may support one public warning, but private reports must not be merged or exposed to one another. The moderator sees cluster confidence and provenance; the public sees the warning's evidence basis/status, not reporter count as a popularity score.

## Current code/spec gaps to address before P0

These are implementation observations, not source-derived claims:

1. **False `CLEAN` state is a release blocker.** Evidence registration currently records `scanStatus: "CLEAN"` after allowlist validation. File type/size validation is not malware scanning. Store `PENDING/QUARANTINED`, run a real scanner, and require the scanner result before any preview or derivative.
2. **Submission validation is too strict and coupled to publication.** It requires type-specific files and clean status, while publication readiness reuses submission requirements and adds `publicSummary`. Split `canSubmit`, `canTriage`, and `canPublish`; remove `publicSummary` from P0 public output.
3. **Retry can create duplicate drafts.** The page saves a draft on submit without retaining/passing the existing `reportId`. Persist the report ID from the first save and add an idempotency key to final submission.
4. **One locator is sent from the current form.** The domain/spec supports related identifiers, but the UI needs a repeatable locator group and the API must preserve all entries with namespace/provider.
5. **Transactions are under-modeled.** A single `claimedLoss` value cannot represent dates, methods, recipients, currencies, hashes, refunds, or multiple transfers. Add a repeatable private transaction structure and calculate totals.
6. **Role branching is incomplete.** A single generic date/narrative model does not distinguish an incident experienced by a victim from a risk observed by a third party.
7. **Draft save is not a real wizard contract yet.** Save on transitions, resume to the last valid page, retain answers across authentication/back navigation, and return review-page changes correctly.
8. **Public/private preview must reflect the new policy.** The public preview should show structured fields only; remove the public-narrative editing/rewrite task from reporter and moderator workflows.
9. **Uploads need operational constraints.** P0 image/PDF support is reasonable only with quarantine, actual scanning, isolated storage, safe preview, retry/remove, and retention. Defer large video uploads unless resumable upload, transcoding/sandboxing, moderation preview, and capacity are proven.

## P0 acceptance criteria

- A guest can submit a private suspicious-URL/account signal without login or file in under two minutes.
- A signed-in reporter can submit an actionable full report without a file and later add evidence.
- No user must understand Avin's internal taxonomy or choose a primary identifier.
- Direct victim, representative, and observer see different relevant questions and valid unknown options.
- A report with files can be received while scans are pending, but neither staff preview nor publication can access an uncleared original.
- Submit retries are idempotent; same-user recent duplicates can resume; cross-user reports are never disclosed.
- Review shows exactly what stays private and the structured fields that may become public.
- P0 public warnings contain no reporter narrative or generated public summary.
- Confirmation supplies reference, saved answers, status, next event/timing, contact, and official immediate-action routes.
- Submission, triage, and publication readiness are separate server-side policies with audit trails.

## Bottom line

Avin should be stricter than the reference products about what becomes public, but easier than the current proposal about what can be submitted. The core advantage is not a longer form; it is a trustworthy pipeline from low-friction private signal, to structured incident, to evidence-backed moderated warning with a visible correction history.
