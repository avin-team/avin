---
status: accepted
---

# Restrict the Service Advisor to read-only marketplace tools

The Service Advisor will treat participant messages, images, Playbooks, and Seller-authored catalog content as untrusted data and may access marketplace facts only through allowlisted, schema-validated read tools. The model receives no database connection, provider secret, Cart mutation, Checkout command, or Admin capability; Buyer actions continue through existing authorized application flows after explicit confirmation. Tool and model outputs are validated before rendering, only concise grounded fit reasons are shown, and internal chain-of-thought is neither requested nor displayed. This limits autonomous flexibility but preserves Avin's authorization and financial boundaries against prompt injection or malformed model output.
