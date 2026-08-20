---
status: accepted
---

# Keep Advisory Attachments separate from Order Files

Avin will store pre-purchase Advisory Attachments as private, session-owned images rather than reusing CheckoutAttachmentDraft or OrderFile records, whose authorization and lifecycle require an authenticated Buyer, Cart, or Order. Visitor ownership is bound to the opaque Advisory Session capability, every model invocation reauthorizes the attachment server-side, and no public media URL is persisted. The Advisor accepts at most three images per message and five per session, normalizes accepted JPEG, PNG, or WebP uploads before model use, and keeps each model request within a bounded image payload. An Advisory Attachment becomes a Checkout Attachment only after authentication and explicit per-image preview and confirmation, which creates a new Checkout-owned record instead of weakening the original session boundary. This duplicates some upload mechanics but preserves the distinct privacy, retention, and access rules of pre-purchase advice and post-selection fulfillment.
