ALTER TABLE "seller_profile" ADD COLUMN "banner_url" text;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "store_slug" text;--> statement-breakpoint
DO $$
DECLARE
  profile_record record;
  base_slug text;
  candidate_slug text;
  suffix integer;
BEGIN
  FOR profile_record IN
    SELECT "id", "storefront_name"
    FROM "seller_profile"
    ORDER BY "id"
  LOOP
    base_slug := NULLIF(
      REGEXP_REPLACE(
        REGEXP_REPLACE(LOWER(profile_record."storefront_name"), '[^a-z0-9]+', '-', 'g'),
        '(^-+|-+$)',
        '',
        'g'
      ),
      ''
    );

    IF base_slug IS NULL THEN
      base_slug := 'store-' || REPLACE(profile_record."id"::text, '-', '');
    END IF;

    candidate_slug := LEFT(base_slug, 100);
    suffix := 1;

    WHILE EXISTS (
      SELECT 1
      FROM "seller_profile"
      WHERE "store_slug" = candidate_slug
        AND "id" <> profile_record."id"
    ) LOOP
      suffix := suffix + 1;
      candidate_slug := LEFT(base_slug, 100 - LENGTH(suffix::text) - 1)
        || '-' || suffix::text;
    END LOOP;

    UPDATE "seller_profile"
    SET "store_slug" = candidate_slug
    WHERE "id" = profile_record."id";
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "seller_profile" ALTER COLUMN "store_slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "seller_profile_store_slug_idx" ON "seller_profile" USING btree ("store_slug");
