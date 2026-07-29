---
status: accepted
---

# Allow an unauthenticated Admin prototype temporarily

The first `apps/admin` milestone is a UI prototype and may run without authentication in every environment, including production, because no real operator is expected to use it yet. This deliberately trades short-term delivery speed for security and must be treated as temporary: before any real Admin workflow or sensitive data is connected, the app must adopt the existing `@avin/auth` Admin role and 2FA boundary.
