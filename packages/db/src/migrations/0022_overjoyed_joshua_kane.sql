INSERT INTO "ledger_account" (
	"account_key",
	"account_type",
	"balance_side",
	"user_id"
)
SELECT
	'SELLER_WALLET_' || seller_accounts.account_suffix || ':' || approved_sellers.user_id,
	seller_accounts.account_type::"ledger_account_type",
	'CREDIT'::"ledger_balance_side",
	approved_sellers.user_id
FROM (
	SELECT DISTINCT "user_id"
	FROM "seller_application"
	WHERE "status" = 'APPROVED'
) AS approved_sellers
CROSS JOIN (
	VALUES
		('PENDING', 'SELLER_WALLET_PENDING'),
		('AVAILABLE', 'SELLER_WALLET_AVAILABLE'),
		('HELD', 'SELLER_WALLET_HELD')
) AS seller_accounts(account_suffix, account_type)
ON CONFLICT ("account_key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "ledger_account" (
	"account_key",
	"account_type",
	"balance_side"
)
VALUES
	('PLATFORM_BANK_CLEARING', 'PLATFORM_BANK_CLEARING', 'DEBIT'),
	('PLATFORM_COMMISSION', 'PLATFORM_COMMISSION', 'CREDIT')
ON CONFLICT ("account_key") DO NOTHING;
--> statement-breakpoint
-- Move legacy Seller proceeds into the new SellerWallet ledger without editing history.
DO $$
DECLARE
	legacy_seller RECORD;
	migration_transaction_id uuid;
	legacy_balance_after integer;
	seller_balance_after integer;
BEGIN
	FOR legacy_seller IN
		SELECT
			approved_sellers.user_id,
			legacy_account.id AS legacy_account_id,
			legacy_account.balance_amount AS legacy_balance,
			legacy_account.balance_side AS legacy_balance_side,
			seller_account.id AS seller_account_id,
			seller_account.balance_amount AS seller_balance,
			wallet.id AS wallet_id,
			wallet.available_balance AS wallet_available_balance
		FROM (
			SELECT DISTINCT "user_id"
			FROM "seller_application"
			WHERE "status" = 'APPROVED'
		) AS approved_sellers
		LEFT JOIN "ledger_account" AS legacy_account
			ON legacy_account.account_key = 'USER_WALLET_AVAILABLE:' || approved_sellers.user_id
		LEFT JOIN "ledger_account" AS seller_account
			ON seller_account.account_key = 'SELLER_WALLET_AVAILABLE:' || approved_sellers.user_id
		LEFT JOIN "user_wallet" AS wallet
			ON wallet.user_id = approved_sellers.user_id
		WHERE legacy_account.balance_amount > 0
			OR coalesce(wallet.available_balance, 0) > 0
		ORDER BY approved_sellers.user_id
	LOOP
		IF legacy_seller.wallet_id IS NULL THEN
			RAISE EXCEPTION
				'Cannot migrate SellerWallet for %: legacy UserWallet is missing',
				legacy_seller.user_id;
		END IF;

		IF legacy_seller.legacy_account_id IS NULL THEN
			RAISE EXCEPTION
				'Cannot migrate SellerWallet for %: legacy ledger account is missing',
				legacy_seller.user_id;
		END IF;

		IF legacy_seller.seller_account_id IS NULL THEN
			RAISE EXCEPTION
				'Cannot migrate SellerWallet for %: SellerWallet account is missing',
				legacy_seller.user_id;
		END IF;

		IF legacy_seller.legacy_balance_side <> 'CREDIT' THEN
			RAISE EXCEPTION
				'Cannot migrate SellerWallet for %: legacy account has unexpected balance side',
				legacy_seller.user_id;
		END IF;

		IF legacy_seller.legacy_balance <> legacy_seller.wallet_available_balance THEN
			RAISE EXCEPTION
				'Cannot migrate SellerWallet for %: ledger and wallet balances differ',
				legacy_seller.user_id;
		END IF;

		IF legacy_seller.legacy_balance = 0 THEN
			CONTINUE;
		END IF;

		INSERT INTO "ledger_transaction" (
			"amount",
			"description",
			"reference",
			"type"
		)
		VALUES (
			legacy_seller.legacy_balance,
			'SELLER_WALLET_MIGRATION ' || legacy_seller.user_id,
			'AVTX-SELLER-WALLET-MIGRATION-' || legacy_seller.user_id,
			'SELLER_WALLET_MIGRATION'::"ledger_transaction_type"
		)
		RETURNING "id" INTO migration_transaction_id;

		UPDATE "ledger_account"
		SET
			"balance_amount" = "balance_amount" - legacy_seller.legacy_balance,
			"updated_at" = now()
		WHERE "id" = legacy_seller.legacy_account_id
		RETURNING "balance_amount" INTO legacy_balance_after;

		UPDATE "ledger_account"
		SET
			"balance_amount" = "balance_amount" + legacy_seller.legacy_balance,
			"updated_at" = now()
		WHERE "id" = legacy_seller.seller_account_id
		RETURNING "balance_amount" INTO seller_balance_after;

		INSERT INTO "ledger_posting" (
			"balance_after",
			"credit_amount",
			"debit_amount",
			"ledger_account_id",
			"transaction_id"
		)
		VALUES
			(
				legacy_balance_after,
				0,
				legacy_seller.legacy_balance,
				legacy_seller.legacy_account_id,
				migration_transaction_id
			),
			(
				seller_balance_after,
				legacy_seller.legacy_balance,
				0,
				legacy_seller.seller_account_id,
				migration_transaction_id
			);

		UPDATE "user_wallet"
		SET
			"available_balance" = "available_balance" - legacy_seller.legacy_balance,
			"updated_at" = now()
		WHERE "id" = legacy_seller.wallet_id;
	END LOOP;
END $$;
