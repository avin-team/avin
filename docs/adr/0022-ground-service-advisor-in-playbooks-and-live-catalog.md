---
status: accepted
---

# Ground the Service Advisor in playbooks and the live catalog

The Service Advisor will combine Admin-owned `Advisor Playbook`s with deterministic retrieval and revalidation of currently purchasable public `SERVICE` Listings. The AI may clarify a `Service Need`, rank up to three eligible Listings, identify the most suitable `ServicePackage` when it has enough information, and explain its reasoning, but it cannot invent catalog facts or complete the Buyer's package selection. We chose this hybrid approach over a prompt-only advisor, which is difficult to constrain and keep current, and a rigid decision tree, which cannot adapt naturally to varied Buyer descriptions; the trade-off is maintaining playbook content and an orchestration layer between the model and marketplace APIs.

The model's self-reported confidence is not an eligibility signal. A recommendation requires a matched Sub-Category, all required Playbook information, no unresolved exclusion, and at least one revalidated purchasable candidate. Fit to the Service Need ranks first; budget, scope, and timing constrain eligibility; rating and completed-order count only break ties, and P0 has no paid recommendation placement. Playbooks are versioned through `DRAFT`, `PUBLISHED`, and `ARCHIVED` rather than edited in place, with at most one published version per Sub-Category.

An Advisory Session pins a Playbook version when it begins evaluating a Sub-Category so a published update cannot change the rules mid-conversation, while catalog eligibility remains live and is revalidated whenever a recommendation is revisited or acted on. A recommendation is not terminal: the participant may refine the Service Need and produce a newer current recommendation while retaining prior results as history.

One session addresses one active Service Need. Ambiguous routing is resolved with a distinguishing question before a Playbook is pinned; a separate need starts a separate session. A Sub-Category without a published Playbook, a COURSE request, or a hidden or archived taxonomy branch produces a transparent browse/no-match outcome instead of an improvised recommendation. When multiple Sellers are equally eligible, the top three contain at most one Listing per Seller; repeated results from one Seller are allowed only when no suitable alternative exists.

Recommendation and tool results must pass schema validation; one repair attempt is allowed before the turn fails visibly and can be retried idempotently. A failed or interrupted stream never creates a completed recommendation. Advisory Summary generation begins only after the participant selects a recommendation, and neither that summary nor any attachment crosses into Checkout without explicit review and confirmation.
