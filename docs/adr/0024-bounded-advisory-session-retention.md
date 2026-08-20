---
status: accepted
---

# Retain Advisory Sessions only for a bounded period

Avin will persist resumable Advisory Sessions without treating them as Order Chat or durable support history. A Visitor session uses an opaque identifier and expires after 24 hours of inactivity; a Visitor may explicitly link a session after authentication, after which it expires 30 days after its last activity, and the participant may delete either form earlier at any time. Deletion removes raw messages, summaries, and private Advisory Attachment objects while retaining only content-free aggregate analytics; uncommitted attachment uploads are removed after one hour. Raw transcripts and images are not retained indefinitely or used to train a model, and Admin access is limited to content that the participant deliberately submits as feedback. Each participant records versioned Advisor Consent before the first session. Content-free aggregate analytics may be retained for 13 months and content-free technical request logs for 30 days; provider requests never fall back to an unpaid tier and operational logs exclude prompt text, responses, images, signed URLs, and decrypted credentials. This accepts short-lived server-side conversation storage to preserve continuity while limiting involuntary account linkage and long-term exposure of pre-purchase conversation data.
