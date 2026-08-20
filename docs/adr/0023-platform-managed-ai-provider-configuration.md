---
status: superseded by ADR-0027
---

# Manage AI provider configuration at the platform boundary

Avin will expose one platform-wide, audited AI provider configuration to 2FA-authenticated Admins rather than accepting Seller credentials, arbitrary provider endpoints, or silently selected fallbacks. P0 uses an allowlisted Gemini Developer API adapter with an Admin-selected supported model and a credential stored as database ciphertext under a server-only master key; APIs expose only masked metadata, test new credentials before activation, and never return plaintext. Google AI Pro and Antigravity entitlements are not backend credentials, so Avin will not reuse Antigravity OAuth or CLI tokens; the provider boundary remains extensible to supported integrations such as Vertex AI. This trades additional secret-rotation and audit machinery for runtime Admin control without exposing provider secrets to either frontend application.
