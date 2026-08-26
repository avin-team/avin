# Let Admin publish immutable Provider profile versions

Protection Providers authenticate through a distinct `PROVIDER` account, separate from Buyer, Seller, and Admin identities, and receive a private workspace to inspect their profile and request revisions. Only an Admin may publish verified identity, free-text registered services, payment information, status, consent, or Recommended Transaction Limit as a new immutable Provider Profile Version; the prior version remains authoritative until approval, sensitive changes trigger re-verification, and P0 has no scheduled annual re-verification. This prevents a verified Provider from silently replacing the destination or service that users relied on while still giving the Provider visibility and a correction path.

The distinct `PROVIDER` account decision is superseded by ADR-0033. Admin-only publication and immutable profile versioning remain accepted.
