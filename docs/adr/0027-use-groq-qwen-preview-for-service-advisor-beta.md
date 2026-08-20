---
status: accepted
---

# Use Groq Qwen Preview for the Service Advisor beta

Avin will use Groq's `qwen/qwen3.6-27b` Preview model for development, internal preview, and a controlled public beta because it supports Vietnamese dialogue, image input, structured output, and disabled reasoning through `reasoning_effort: "none"`. The integration uses a version-pinned `@ai-sdk/groq` provider after a compatibility test proves that the option is transmitted correctly, caps output at 1,024 tokens, and stores the Admin-managed Groq key as encrypted platform configuration. If the provider adapter cannot transmit the reasoning option, Avin will use a narrow Groq Chat Completions adapter rather than silently enabling reasoning.

The public beta deliberately uses Groq's free plan within its documented 1,000-request and 200,000-token daily limits, with Groq Zero Data Retention enabled and verified before activation. The team accepts that the model is Preview rather than production-supported and may be withdrawn on short notice; reaching a quota, losing ZDR, or losing model availability makes the Advisor unavailable without an automatic provider fallback. Full production rollout remains gated on this model becoming Production or an allowlisted production vision model passing the same compatibility, privacy, Playbook, and multimodal tests. Advisor Consent states concisely that participant text and images are processed by the configured AI provider, while detailed provider data-location language is deferred from the P0 UI.
