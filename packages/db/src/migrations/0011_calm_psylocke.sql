ALTER TABLE "seller_profile" ADD COLUMN "store_slug_locked_at" timestamp;

UPDATE "seller_profile" AS profile
SET "store_slug_locked_at" = COALESCE(profile."updated_at", NOW())
FROM "user" AS account
WHERE account.id = profile.user_id
  AND account.role = 'SELLER'
  AND profile.avatar_url IS NOT NULL
  AND btrim(profile.avatar_url) <> ''
  AND profile.bio IS NOT NULL
  AND btrim(profile.bio) <> ''
  AND btrim(profile.store_slug) <> ''
  AND btrim(profile.storefront_name) <> ''
  AND EXISTS (
    SELECT 1
    FROM "seller_application" AS application
    WHERE application.user_id = profile.user_id
      AND application.status = 'APPROVED'
      AND application.created_at = (
        SELECT MAX(latest.created_at)
        FROM "seller_application" AS latest
        WHERE latest.user_id = profile.user_id
      )
  );
