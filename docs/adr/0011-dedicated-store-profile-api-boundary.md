# Dedicated Store profile API boundary

The Seller dashboard treats Store profile management as a Seller Store concern, not a SellerApplication concern. We will expose dedicated `sellerStore` procedures for reading and updating the existing Seller profile record while retaining `sellerApplication` procedures for onboarding, keeping lifecycle boundaries explicit and preventing ongoing Store edits from inheriting application-specific semantics.

**Status**: accepted

## Considered Options

- Reuse `sellerApplication.getProfile` and `updateDraftProfile` for the dashboard.
- Add a dedicated `sellerStore` API boundary while sharing the underlying profile record.

The dedicated boundary was chosen because the two contexts have different lifecycles even though they currently share profile data.
