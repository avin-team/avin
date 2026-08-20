# AI Service Advisor for guided SERVICE discovery

## Problem Statement

Visitors and Users often know the outcome they want or can show a screenshot of what is wrong, but they do not know Avin's taxonomy, which SERVICE Listing matches their Service Need, or which ServicePackage to choose. Today they must interpret Category names, Listing descriptions, package scope, price, Processing Expectation, and WarrantyPolicy without guided help. This creates uncertainty, poor-fit purchases, abandoned discovery, and avoidable fulfillment friction.

Avin also lacks an Admin-managed way to encode the questions and exclusion rules that distinguish similar Sub-Categories. A generic model reading Seller-authored catalog text alone would be vulnerable to stale facts, hallucinated offerings, prompt injection, and inconsistent recommendations.

## Solution

Add a public, Vietnamese-first Service Advisor that lets a Visitor or User explain one Service Need through text, guided choices, and private Advisory Attachments. The Advisor asks one focused clarification question at a time, uses a versioned Admin-owned Advisor Playbook to determine when it has enough information, and combines that knowledge with deterministic retrieval and revalidation of the live public SERVICE catalog.

When the Playbook completion gate is satisfied, the Advisor returns an explainable Advisor Recommendation containing at most three currently purchasable Listings and a suggested ServicePackage when appropriate. It never completes package selection, Cart mutation, or Checkout for the Buyer. The Buyer can refine the conversation, open a recommended Listing, review an editable Advisory Summary, and explicitly choose which summary and images to reuse at Checkout.

The beta uses Groq's `qwen/qwen3.6-27b` Preview model on the free plan, with reasoning disabled and Groq Zero Data Retention verified before activation. The feature is explicitly a controlled beta rather than production-stable while the model remains Preview.

## User Stories

1. As a Visitor, I want to open the Service Advisor without creating an account, so that I can understand which service may help me before committing to Avin.
2. As a User, I want to open the same Advisor experience from the public marketplace, so that authenticated and unauthenticated discovery behave consistently.
3. As a participant, I want a concise AI-processing and retention notice before my first Advisory Session, so that I understand how my text and images are handled.
4. As a participant, I want my Advisor Consent version and timestamp recorded, so that Avin can prove which notice I accepted.
5. As a participant, I want to describe my Service Need in free-form text, so that I do not need to know Avin's Category vocabulary.
6. As a participant, I want suggestion chips for common needs, so that I can begin quickly when one matches my situation.
7. As a participant, I want suggestion chips to come from active Categories and published Advisor Playbooks, so that the choices remain aligned with Admin-managed marketplace knowledge.
8. As a participant, I want to write in Vietnamese, English, or a mixture of both, so that technical terminology does not prevent me from explaining my need.
9. As a participant, I want the Advisor to answer in Vietnamese, so that the public beta has one consistent canonical language.
10. As a participant, I want the Advisor to ask one clarification question at a time, so that the experience feels manageable rather than like a long form.
11. As a participant, I want both quick choices and a free-text answer for each question, so that a Playbook never forces me into an inaccurate option.
12. As a participant, I want to attach screenshots or reference images, so that visible errors and design problems can inform my Service Need.
13. As a participant, I want to attach up to three images to one message and up to five images to one Advisory Session, so that I can provide enough context without creating an unbounded model request.
14. As a participant, I want unsupported, corrupt, oversized, or unsafe images rejected clearly, so that I know how to correct the upload.
15. As a participant, I want image metadata removed and images normalized before processing, so that unnecessary private metadata is not sent to the AI provider.
16. As a participant, I want to preview and remove an Advisory Attachment, so that I remain in control before it is analyzed.
17. As a participant, I want a warning not to submit passwords, OTPs, access tokens, payment details, or identity documents, so that I do not accidentally expose secrets.
18. As a participant, I want a likely credential or prohibited payload rejected before it becomes conversation history, so that blocked secrets are not retained or forwarded.
19. As a participant, I want the Advisor to say when an image is unreadable or irrelevant, so that it does not invent an interpretation.
20. As a participant, I want the Advisor to use images only as context for my Service Need, so that it does not perform identity verification or professional diagnosis.
21. As a participant with several problems, I want the Advisor to ask which one is the priority, so that one Advisory Session stays focused on one Service Need.
22. As a participant with another problem, I want to start a separate Advisory Session, so that the two recommendation paths do not contaminate each other.
23. As a participant whose description matches several Sub-Categories, I want a distinguishing question, so that the Advisor does not silently choose the wrong Playbook.
24. As a participant, I want the Advisor to pin a Playbook only after one Sub-Category is selected, so that the questionnaire follows a coherent domain path.
25. As a participant, I want a pinned Playbook version to remain stable during my session, so that an Admin publish does not change the rules midway.
26. As a participant, I want the Advisor to stop rather than improvise when a Sub-Category has no published Playbook, so that recommendations remain governed.
27. As a participant with a COURSE need, I want a clear explanation that the beta supports SERVICE only and a link to browse COURSE Listings, so that I still have a useful next step.
28. As a participant, I want the Advisor to recognize when I already know the Listing I want, so that it can revalidate and open that Listing without forcing a full questionnaire.
29. As a participant, I want package clarification only when the Listing has meaningful package choices, so that I answer only questions needed for my purchase decision.
30. As a participant, I want an Advisor Recommendation only after all required Playbook information is present, so that the result is not based on model self-confidence alone.
31. As a participant, I want unresolved exclusion conditions to block recommendation, so that the Advisor does not knowingly suggest an unsuitable service.
32. As a participant, I want every recommendation to reference a currently purchasable public SERVICE Listing, so that hidden, paused, archived, enforced, or inactive-category offerings are excluded.
33. As a participant, I want each recommendation to include no more than three Listings, so that I can compare a focused shortlist.
34. As a participant, I want the best-fitting ServicePackage identified when enough information exists, so that I understand which package likely matches my Service Need.
35. As a Buyer, I want to confirm the ServicePackage myself, so that the AI cannot silently make a commercial choice for me.
36. As a participant, I want recommendation ranking to prioritize Service Need fit, package scope, budget, and timing, so that the shortlist reflects my actual constraints.
37. As a participant, I want ratings and completed-order counts used only as tie-breakers, so that popularity does not override fit.
38. As a participant, I want no paid or sponsored recommendation placement, so that commercial promotion does not masquerade as AI suitability.
39. As a participant, I want at most one Listing per Seller when equally eligible alternatives exist, so that the shortlist presents meaningful marketplace choice.
40. As a participant, I want the Advisor to disclose when only one Seller has suitable Listings, so that repeated results from that Seller are understandable.
41. As a participant, I want each recommendation card to show the Listing, suggested package, price, Processing Expectation, WarrantyPolicy, rating, Seller, and concise fit reasons, so that I can make an informed comparison.
42. As a participant, I want recommendation cards labelled as AI-generated suggestions, so that I do not mistake them for guarantees or professional diagnosis.
43. As a participant, I want only concise grounded fit reasons, so that hidden chain-of-thought is neither requested nor exposed.
44. As a participant, I want to continue the conversation after a recommendation, so that I can refine my Service Need when the first shortlist is imperfect.
45. As a participant, I want the newest eligible recommendation marked as current while earlier recommendations remain visible, so that I can follow how my answers changed the result.
46. As a participant, I want a historical recommendation marked unavailable if its Listing or package is no longer purchasable, so that stale history cannot become a purchase path.
47. As a participant, I want recommendation availability revalidated when I reopen the session or select a CTA, so that current marketplace state controls the next action.
48. As a participant, I want an unavailable recommendation to offer a new recommendation or manual Category browse, so that I am not stranded.
49. As a participant, I want the recommended package highlighted on the Listing detail page, so that I can inspect it without losing the Advisor's context.
50. As a Buyer, I want the Listing detail and existing Cart flow to remain authoritative, so that package confirmation and purchase authorization still follow marketplace rules.
51. As a User, I want an editable Advisory Summary created only after I choose a recommendation, so that speculative conversation is not treated as fulfillment input.
52. As a User, I want to review and confirm an Advisory Summary before copying it into the Buyer Checkout Note, so that only accurate information reaches the Seller.
53. As a User, I want to choose individual Advisory Attachments to reuse at Checkout, so that unrelated or sensitive images are not transferred automatically.
54. As a User, I want a selected Advisory Attachment copied into a new Checkout-owned attachment, so that Advisory Session access rules are not weakened.
55. As a Visitor who chooses a recommendation, I want to authenticate before Cart or Checkout, so that purchases remain tied to a Buyer account.
56. As a Visitor, I want my active session to survive refresh through an opaque session capability, so that account creation is not required for continuity.
57. As a Visitor who signs in, I want to choose whether to link the Advisory Session to my User account, so that Avin does not correlate anonymous history without permission.
58. As a Visitor, I want an inactive session deleted after 24 hours, so that anonymous conversation data is short-lived.
59. As a User who explicitly saves a session, I want it retained for 30 days after its last activity, so that I can resume it without creating permanent support history.
60. As a participant, I want to delete an Advisory Session at any time, so that its messages, summaries, and attachments are removed before normal expiry.
61. As a participant, I want unfinished image uploads deleted after one hour, so that abandoned private objects are not retained.
62. As a participant, I want to stop a streaming answer, so that I remain in control of a slow or irrelevant generation.
63. As a participant, I want a disconnected or invalid response shown as failed rather than completed, so that it cannot create a false recommendation.
64. As a participant, I want to retry a failed turn without duplicate messages or recommendations, so that transient failures do not corrupt the session.
65. As a participant, I want the Advisor to make the best valid conclusion at the 15-turn limit, so that it does not end abruptly.
66. As a participant, I want missing information explained when the turn limit prevents a recommendation, so that I can continue through manual browse.
67. As a participant, I want a clear unavailable state when the provider, model, daily quota, ZDR control, or Admin kill switch prevents generation, so that failure is not hidden.
68. As a participant, I want my session retained during a temporary provider outage, so that I can resume when the Advisor returns.
69. As a participant, I want manual Category browsing available whenever the Advisor cannot proceed, so that AI is never the only discovery route.
70. As a participant, I want to rate a recommendation with positive or negative feedback and an optional reason, so that Avin can measure usefulness.
71. As a participant, I want transcript sharing to require an explicit feedback action, so that ordinary conversations are not exposed to Admins.
72. As a participant, I want separate consent for every image included with feedback, so that text feedback does not silently disclose images.
73. As a mobile participant, I want a responsive full-page Advisor, so that image upload, chat, and recommendation comparison remain usable on a small screen.
74. As a keyboard or screen-reader user, I want labelled controls, visible focus, streaming announcements, Stop control, and keyboard-operable image previews, so that the Advisor is accessible.
75. As a motion-sensitive participant, I want reduced-motion preferences respected, so that streaming and transitions do not create discomfort.
76. As an Admin, I want to enable or disable the Service Advisor globally, so that I can stop traffic without deleting sessions.
77. As an Admin, I want to configure the Groq provider, allowlisted model, and encrypted API key, so that provider configuration does not require a code release.
78. As an Admin, I want API responses to expose only masked key metadata, so that plaintext credentials never return to a frontend.
79. As an Admin, I want to test a new key and model before activation, so that a broken configuration cannot replace the active configuration.
80. As an Admin, I want activation to verify Groq Zero Data Retention, so that public beta traffic never runs without the agreed data control.
81. As an Admin, I want provider configuration changes audited with actor, time, provider, model, and outcome, so that secret operations are accountable without logging the secret.
82. As an Admin, I want to select only tested vision-capable models, so that image inputs are never silently ignored.
83. As an Admin, I want model deprecation or withdrawal surfaced as an unavailable configuration, so that Avin does not silently switch provider behavior.
84. As an Admin, I want to create an Advisor Playbook draft for one Sub-Category, so that marketplace knowledge is governed by the relevant taxonomy.
85. As an Admin, I want each Playbook to define need signals, clarification questions, exclusion conditions, completion requirements, and suggestion content, so that the Advisor has structured guidance.
86. As an Admin, I want a Playbook lifecycle of DRAFT, PUBLISHED, and ARCHIVED, so that published guidance is versioned rather than edited in place.
87. As an Admin, I want at most one published Playbook version per Sub-Category, so that new sessions have one authoritative path.
88. As an Admin, I want positive, ambiguous, exclusion, and no-match test scenarios attached to a Playbook, so that expected behavior is explicit.
89. As an Admin, I want publish blocked when required scenarios fail, so that a Playbook cannot recommend prematurely or return an ineligible Listing.
90. As an Admin, I want archived or hidden taxonomy to disable corresponding Playbooks for new and active recommendations, so that marketplace visibility remains authoritative.
91. As an Admin, I want aggregate funnel metrics for session start, completion, recommendation, Listing click, summary copy, Checkout, no-match, and abandonment, so that I can understand product performance.
92. As an Admin, I want latency, error, model, token, and quota metrics, so that I can operate the beta within Groq free limits.
93. As an Admin, I want an 80-percent daily quota warning and a hard stop at the limit, so that Avin does not rely on an unavailable provider request.
94. As an Admin, I want no default transcript browser, so that operational analytics do not become a privacy backdoor.
95. As an Admin, I want explicitly shared feedback visible only with its approved transcript and individually consented images, so that review respects participant intent.
96. As an operator, I want technical logs to exclude prompt text, response text, images, signed URLs, and decrypted credentials, so that observability does not duplicate private content.
97. As an operator, I want aggregate analytics retained for 13 months and content-free request logs retained for 30 days, so that operational trends remain available without extending conversation retention.
98. As an operator, I want first-token, completion, image-turn, and timeout metrics measured against the agreed latency targets, so that slow beta behavior is visible.
99. As an operator, I want the AI Elements compatibility spike to pass before feature implementation proceeds, so that Avin does not assume unsupported Vite behavior.
100. As an operator, I want rollout gated through internal preview and a 10-percent public beta, so that privacy, authorization, cost, and reliability failures are detected before broader exposure.

## Implementation Decisions

- The feature uses the canonical domain terms Service Need, Service Advisor, Advisory Session, Advisory Attachment, Advisory Summary, Advisor Playbook, Advisor Recommendation, Advisor Feedback, and Advisor Consent.
- P0 supports SERVICE discovery only. COURSE recommendations and professional diagnosis are not part of the Advisor contract.
- The buyer-facing experience is a dedicated `/advisor` page with entry points from the home and catalog surfaces. A global floating overlay is not required.
- The React/Vite frontend uses vendored AI Elements components for conversation, message, prompt input, and suggestions. AI Elements compatibility with the existing Vite, React 19, Tailwind, and shadcn setup is a gated spike. Small component-source adaptations are allowed; migrating the application to Next.js is not.
- The chat client uses AI SDK UI transport and a dedicated Hono streaming endpoint that returns the AI SDK UI Message Stream protocol. The typed business API remains the source for session commands, Admin operations, catalog retrieval, and non-streaming state.
- A Service Advisor module owns orchestration. Provider-specific behavior is hidden behind a narrow model adapter; catalog eligibility, ranking gates, Playbook state, consent, retention, and authorization remain provider-independent.
- The primary public API supports recording Advisor Consent, creating/resuming/deleting an Advisory Session, linking a Visitor session after authentication, listing session history, sending/stopping/retrying a turn, submitting Advisor Feedback, and selecting a recommendation for handoff.
- Visitor ownership is represented by an opaque, high-entropy session capability stored securely by the browser. Authenticated ownership uses the User identity. Linking requires an explicit command and never occurs implicitly at sign-in.
- An Advisory Session contains one active Service Need, ordered messages, zero or more Advisory Attachments, pinned Playbook references, successive Advisor Recommendations, an optional Advisory Summary, ownership, activity timestamps, expiry, and generation state.
- Only one generation may be active per session. Client retries carry idempotency keys, and a stopped, failed, timed-out, or schema-invalid generation cannot create a completed recommendation.
- The model receives structured session state, no more than the six most recent exchanges, and only images relevant to the current turn. Avin retains the full bounded transcript for UX but does not resend the full transcript on every provider call.
- The completion gate is deterministic: exactly one eligible Sub-Category has been selected, a published Playbook version is pinned, every required Playbook answer exists, no exclusion remains unresolved, and at least one live catalog candidate passes eligibility.
- Model self-reported confidence is not stored or used to authorize recommendation.
- Catalog retrieval starts from current public discovery rules and further requires a purchasable SERVICE Listing and an available package when relevant. Every historical recommendation is revalidated before display as current or before CTA navigation.
- Ranking prioritizes Service Need fit, package scope, budget, and timing. Rating and completed-order count are tie-breakers. Sponsored placement is prohibited in P0. The top three are diversified to one Listing per Seller when equivalent alternatives exist.
- Recommendation output is schema-validated and permits one repair attempt. The rendered result contains catalog facts and concise fit reasons, never chain-of-thought.
- The model has read-only, allowlisted, schema-validated tools. It receives no database connection, Admin capability, provider secret, Cart mutation, Checkout command, or financial operation.
- Seller-authored Listing content, Admin-authored Playbook content, participant messages, and images are untrusted inputs. Instructions embedded in these inputs cannot change tool permissions, system policy, completion gates, or output schemas.
- Advisor Playbooks are versioned per Sub-Category with DRAFT, PUBLISHED, and ARCHIVED states. Each Sub-Category has at most one published version. Active sessions pin a version when routing becomes unambiguous; new versions apply to new pins only.
- Playbook publishing requires positive, ambiguous, exclusion, and no-match scenarios. A publish attempt must execute these scenarios against deterministic test fixtures and the configured model contract, and it is blocked on failure.
- Suggestion chips are Admin-managed data derived from active taxonomy and published Playbooks rather than hard-coded frontend strings.
- Advisory Attachments use a separate private storage namespace and persistence model from CheckoutAttachmentDraft and OrderFile. Existing private-upload mechanics may be reused, but Order and Cart authorization semantics may not.
- Accepted Advisor images are JPEG, PNG, or WebP. A message accepts at most three images and a session at most five. Uploads are MIME-sniffed, decoded, re-encoded, stripped of metadata, bounded to a 2,048-pixel long edge and approximately 3 MB per normalized image, and kept within a 12 MB aggregate model payload.
- Advisory image access is reauthorized server-side before each provider request. The browser passes an attachment identifier, not a public or persisted signed URL. Temporary provider input uses inline bytes or an equivalent private transfer.
- Unsupported, malformed, prohibited, or obvious-secret content is rejected and removed. A rejected raw upload does not become message history. Uncommitted uploads expire after one hour.
- Advisory Attachments share the session's 24-hour or 30-day retention and are deleted with the session. The object cleanup job must reconcile database state and private object storage idempotently.
- An Advisory Attachment is never an OrderFile. Explicit handoff creates a new Checkout-owned attachment after User authentication, per-image preview, and confirmation.
- Advisory Summary generation occurs only after a participant selects an Advisor Recommendation. The User edits and confirms the summary before it can populate the optional Buyer Checkout Note.
- The existing Listing detail, package selector, Cart, Checkout, buyer description, and Checkout Attachment rules remain authoritative. The Advisor cannot bypass explicit package choice, material contract revalidation, authentication, or checkout idempotency.
- The provider beta uses Groq `qwen/qwen3.6-27b`, currently a Preview model, with `reasoning_effort` set to `none` and output capped at 1,024 tokens. The provider/package versions are locked.
- The integration first attempts the official Groq AI SDK provider. A contract spike must prove that the provider transmits the reasoning option correctly. If it cannot, a narrow Chat Completions adapter is used rather than silently enabling reasoning.
- The controlled public beta deliberately uses the Groq free plan, subject to its 1,000-request and 200,000-token daily limits. Free capacity is a product constraint, not an availability guarantee.
- Groq Zero Data Retention must be enabled and verified before public traffic. Loss of ZDR, quota exhaustion, model withdrawal, provider failure, or the Admin kill switch makes the Advisor unavailable. There is no silent provider or model fallback.
- The Groq API key is a platform-wide secret stored as ciphertext under a server-only master key. Admin APIs return masked metadata only. New credentials are tested before atomic activation, and changes use audited, 2FA-protected Admin procedures.
- Admin model choices come from an application-maintained allowlist of tested text-and-image models. Arbitrary base URLs and arbitrary model identifiers are not accepted.
- The provider core prompt and security policy are versioned in code. Admins manage Provider Configuration and Advisor Playbooks but cannot edit the core system prompt in P0.
- The feature adds Admin surfaces for AI Settings, Advisor Playbooks and their test scenarios, and content-free Advisor Analytics. It does not add a general transcript browser.
- Advisor Consent is versioned and records the participant, or Visitor capability, consent version, and time. The P0 notice concisely states that text and images are processed by the configured AI provider, explains Avin retention, and prohibits secrets.
- Public legal routes for Terms and Privacy are added and linked from the Advisor consent experience. A separate Advisor-only age gate is not introduced; marketplace-wide age language requires legal review before public beta.
- Visitor sessions expire after 24 hours of inactivity. Explicitly linked User sessions expire after 30 days of inactivity. Participants can delete earlier. Expiration and deletion remove messages, summaries, recommendations containing participant text, and private image objects.
- Aggregate content-free analytics may remain for 13 months. Content-free technical request logs remain for 30 days. Provider request IDs, model/version, latency, token counts, tool names, status, and error codes are permitted; conversation content, images, signed URLs, and decrypted credentials are prohibited from operational logs.
- Rate limits are configurable. Initial defaults are 15 participant turns per session, at most five new Visitor sessions per browser/IP combination per 24 hours, and at most 20 new User sessions per 24 hours.
- Daily provider quota usage is tracked. Admins receive a warning at 80 percent. At 100 percent, no new model call begins; manual catalog browsing remains available.
- Latency targets are first token p95 under three seconds, completed text turns under 15 seconds, image turns under 25 seconds, and a hard model-call timeout of 30 seconds.
- The UI is responsive and keyboard accessible, announces streamed output appropriately, exposes Stop and retry controls, respects reduced motion, and makes image preview/removal operable without hover.
- Rollout gates are: AI Elements and Groq contract spikes, internal/Admin preview with Playbook scenarios, a 10-percent public beta, and broader rollout only after authorization, privacy, latency, quota, and no-match metrics are acceptable. The Qwen Preview model is not described as production-stable.

## Testing Decisions

- Tests assert externally visible domain behavior and authorization outcomes rather than internal helper structure, prompt wording, SQL shape, or component implementation details.
- The primary seam is the Service Advisor orchestration/API boundary. A test invokes a complete turn through the public procedure or orchestration service using a fixed clock, seeded Playbook/catalog fixtures, a fake private object store, and a deterministic fake model adapter. This one seam covers consent, session ownership, routing, Playbook pinning, completion gates, catalog eligibility, ranking, recommendations, retries, retention decisions, quota behavior, and no-match outcomes.
- Primary-seam tests include Visitor and User ownership, explicit linking, cross-session denial, deletion, 24-hour/30-day expiry, one-active-generation enforcement, idempotent retry, Stop behavior, schema repair once, and failure without a partial recommendation.
- Primary-seam tests include ambiguous routing, one Service Need per session, unsupported COURSE requests, missing/archived Playbooks, hidden Categories, unavailable Listings/packages, Seller enforcement, Seller diversity, package suggestion without automatic selection, and live revalidation of historical recommendations.
- Primary-seam tests include prompt-injection attempts from participant text, Listing descriptions, Playbook content, and model tool arguments, proving that only allowlisted read operations occur.
- Primary-seam tests include the Groq quota boundaries, ZDR activation gate, model withdrawal, Admin disablement, and manual-browse fallback without a provider/model fallback.
- A narrow provider contract seam verifies the exact Groq model ID, reasoning disabled, output bound, multimodal message conversion, tool/schema compatibility, stream protocol, error normalization, and token usage extraction. Deterministic CI uses a fake transport; an environment-gated smoke suite runs separately against Groq and is not silently skipped inside the ordinary test suite.
- A narrow Hono private-upload seam verifies Visitor capability ownership, authenticated ownership, MIME/content validation, count and size limits, unique private keys, metadata removal/normalization, session association, cross-session denial, expiry cleanup, deletion, and absence of public URLs. This follows existing upload-router authorization tests.
- Checkout handoff tests prove that no image or summary transfers automatically, only authenticated and explicitly selected items are copied, new Checkout-owned records are created, the five-image Checkout cap remains authoritative, and Advisory Session deletion does not delete a completed Checkout copy.
- Admin procedure tests invoke typed procedures with Buyer, Seller, Admin-without-2FA, and Admin-with-2FA contexts. They assert provider secret masking, test-before-activation, audit outcomes, ZDR gate, allowlist enforcement, kill switch behavior, Playbook version lifecycle, one-published-version constraint, and publish scenario failures.
- Web page tests use React Testing Library and user-visible roles/text to cover consent, free text, suggestion chips, image preview/removal, Stop/retry, unavailable states, recommendation cards, package highlighting, summary review, explicit image handoff, session deletion, keyboard navigation, and streaming announcements. Business ranking and authorization are not duplicated in component mocks.
- Admin UI tests cover AI Settings status and masked-key interactions, Playbook draft/test/publish flows, analytics without transcript content, quota warnings, and disabled/unavailable states.
- Accessibility checks cover semantic headings, labelled inputs and buttons, focus order/restoration, `aria-live` behavior that does not announce every token, reduced motion, contrast, and keyboard-only image management.
- Retention and cleanup tests use a fixed clock and fake object store to prove exact expiry boundaries and idempotent reconciliation of missing database rows or storage objects.
- Analytics/logging tests assert event names and content-free payloads, including explicit negative assertions that participant text, model text, filenames containing private data, signed URLs, image bytes, and secrets never enter operational logs.
- Prior art is the repository's existing oRPC procedure authorization tests, Listing discovery eligibility tests, Checkout transaction/idempotency tests, private upload-router tests, catalog page interaction tests, and Admin workflow tests.
- End-to-end beta acceptance uses seeded active Categories, published Playbooks, public SERVICE Listings, multiple Sellers, an unavailable Listing transition, a text-only need, an image-assisted need, a no-match need, and a quota/provider outage. It verifies the observable path from `/advisor` to Listing detail and explicit Checkout handoff without letting the model mutate commerce state.

## Out of Scope

- COURSE recommendation or a COURSE-specific Playbook flow.
- Human support handoff or reuse of Order Chat before purchase.
- Professional, medical, legal, financial, identity, or security diagnosis.
- Collecting passwords, OTPs, access tokens, payment data, identity documents, PHI, or other secrets.
- Arbitrary provider endpoints, arbitrary model IDs, Seller-managed provider credentials, or per-Seller AI configuration.
- Automatic fallback to another provider, model, paid plan, or free organization when Groq fails or reaches quota.
- Treating `qwen/qwen3.6-27b` Preview as production-stable or guaranteeing 100-percent availability.
- Embeddings, vector databases, semantic indexes, external web search, Search/Maps grounding, provider File Search, fine-tuning, Batch API, or provider feedback forwarding.
- Admin editing of the core system/safety prompt.
- Displaying or persisting chain-of-thought or using an AI Elements reasoning component.
- Automatic Cart mutation, package selection, Checkout, payment, or Seller communication by the model.
- Automatic transfer of transcript text or images into Checkout, OrderFile, or Seller-visible data.
- A general Admin transcript browser or training a model on ordinary Advisory Sessions.
- Paid/sponsored recommendation placement.
- A global floating chat widget.
- Migrating the buyer web application from Vite to Next.js.
- Marketplace-wide age-policy implementation beyond adding legal routes and obtaining legal review.

## Further Notes

- The accepted domain model and ADRs 0022 through 0027 are normative for this spec. ADR 0023's earlier Gemini-specific provider choice is superseded by ADR 0027; its provider-boundary and encrypted-secret rationale is retained in the Groq decision.
- Groq currently labels `qwen/qwen3.6-27b` Preview. The public beta must be operationally ready for short-notice model withdrawal and must not claim production support.
- Groq's documented free limits are 1,000 requests/day and 200,000 tokens/day for this model. Image turns and repeated context consume this capacity quickly; the hard cap and manual browse fallback are launch requirements.
- Groq Zero Data Retention is available on the free plan but must be enabled and verified for the organization used by Avin before public traffic.
- AI SDK React with a Hono UI Message Stream is supported, while AI Elements' published setup still emphasizes Next.js. The Vite compatibility spike is therefore an explicit gate rather than an assumption.
- The issue should carry only the `ready-for-agent` triage label.
