import { db } from "@avin/db";
import { user } from "@avin/db/schema/auth";
import { cart, cartItem } from "@avin/db/schema/commerce";
import { userWallet } from "@avin/db/schema/wallet";
import { expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { recordBalancedLedgerTransaction } from "../../../../packages/api/src/wallet/ledger";
import { ensureWalletAccounts } from "../../../../packages/api/src/wallet/service";

const SERVICE_LISTING_ID = "4d11e91b-54ff-491e-afb5-ec823aba0804";
const SERVICE_LISTING_TITLE = "Mở khóa Facebook dạng 282 hoặc mạo danh";
const SEED_DEPOSIT_AMOUNT = 50_000_000;

test.use({
  video: "on",
});

test.describe(
  "service custom quantity and checkout flow",
  { tag: ["@commerce", "@critical"] },
  () => {
    test.beforeEach(async () => {
      // 1. Ensure buyer has clean cart
      const [buyer] = await db
        .select()
        .from(user)
        .where(eq(user.email, "e2e-buyer@avin.test"));

      if (!buyer) {
        throw new Error("E2E buyer account not found in database.");
      }

      const [buyerCart] = await db
        .select()
        .from(cart)
        .where(eq(cart.userId, buyer.id));

      if (buyerCart) {
        await db.delete(cartItem).where(eq(cartItem.cartId, buyerCart.id));
      }

      // 2. Ensure buyer wallet has sufficient funds for checkout
      const accounts = await ensureWalletAccounts(db, buyer.id);
      const [wallet] = await db
        .select()
        .from(userWallet)
        .where(eq(userWallet.id, accounts.wallet.id));

      if (!wallet || wallet.availableBalance < 10_000_000) {
        await db.transaction(async (tx) => {
          await recordBalancedLedgerTransaction(tx, {
            amount: SEED_DEPOSIT_AMOUNT,
            description: "E2E seed test balance",
            postings: [
              {
                accountId: accounts.platformAccount.id,
                debitAmount: SEED_DEPOSIT_AMOUNT,
              },
              {
                accountId: accounts.availableAccount.id,
                creditAmount: SEED_DEPOSIT_AMOUNT,
              },
            ],
            reference: `e2e-seed-${Date.now()}`,
            type: "DEPOSIT",
          });
          await tx
            .update(userWallet)
            .set({
              availableBalance: sql`${userWallet.availableBalance} + ${SEED_DEPOSIT_AMOUNT}`,
            })
            .where(eq(userWallet.id, accounts.wallet.id));
        });
      }
    });

    test("adjusts quantity on listing page, cart, and verifies rate breakdown in checkout and order details", async ({
      page,
    }) => {
      // -------------------------------------------------------------
      // Step 1: Listing Detail Page interaction
      // -------------------------------------------------------------
      await test.step("navigate to service listing detail page and test quantity controls", async () => {
        await page.goto(`/listing/${SERVICE_LISTING_ID}`);

        await expect(
          page.getByRole("heading", {
            level: 1,
            name: SERVICE_LISTING_TITLE,
          })
        ).toBeVisible();

        const quantityInput = page.getByRole("spinbutton", {
          name: "Số lượng muốn mua",
        });
        const minusBtn = page.getByRole("button", {
          name: "Giảm Số lượng muốn mua",
        });
        const plusBtn = page.getByRole("button", {
          name: "Tăng Số lượng muốn mua",
        });

        // Initial state: quantity = 1, minus disabled, no total preview
        await expect(quantityInput).toHaveValue("1");
        await expect(minusBtn).toBeDisabled();
        await expect(page.getByText(/^Tổng:/u)).not.toBeVisible();

        // Increment to 2
        await plusBtn.click();
        await expect(quantityInput).toHaveValue("2");
        await expect(minusBtn).toBeEnabled();
        await expect(
          page.getByText("1.400.000 ₫", { exact: false })
        ).toBeVisible();

        // Increment to 3
        await plusBtn.click();
        await expect(quantityInput).toHaveValue("3");
        await expect(
          page.getByText("2.100.000 ₫", { exact: false })
        ).toBeVisible();

        // Decrement back to 2
        await minusBtn.click();
        await expect(quantityInput).toHaveValue("2");
        await expect(
          page.getByText("1.400.000 ₫", { exact: false })
        ).toBeVisible();

        // Direct typing: enter 3 and press Enter to commit
        await quantityInput.fill("3");
        await quantityInput.press("Enter");
        await expect(quantityInput).toHaveValue("3");
        await expect(
          page.getByText("2.100.000 ₫", { exact: false })
        ).toBeVisible();

        // Add 3 units to cart
        const addToCartBtn = page.getByRole("button", { name: "Thêm vào giỏ" });
        await addToCartBtn.click();

        // Immediately navigates to /cart
        await expect(page).toHaveURL(/\/cart(?:\?|$)/u);
      });

      // -------------------------------------------------------------
      // Step 2: Verify and adjust in Cart
      // -------------------------------------------------------------
      await test.step("verify custom quantity and rate breakdown in cart, then adjust with stepper", async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: "Giỏ hàng" })
        ).toBeVisible();

        // Prominent line total: 700k * 3 = 2.100.000 ₫
        await expect(page.getByText("2.100.000 ₫").first()).toBeVisible();

        // Secondary rate breakdown: 700.000 ₫ / lượt × 3 lượt
        await expect(
          page.getByText(/700\.000 ₫ \/ lượt × 3 lượt/u)
        ).toBeVisible();

        const cartPlusBtn = page.getByRole("button", {
          name: `Tăng số lượng cho ${SERVICE_LISTING_TITLE}`,
        });
        const cartMinusBtn = page.getByRole("button", {
          name: `Giảm số lượng cho ${SERVICE_LISTING_TITLE}`,
        });

        // Increment in cart to 4
        await cartPlusBtn.click();
        await expect(page.getByText("2.800.000 ₫").first()).toBeVisible();
        await expect(
          page.getByText(/700\.000 ₫ \/ lượt × 4 lượt/u)
        ).toBeVisible();

        // Decrement in cart to 3
        await cartMinusBtn.click();
        await expect(page.getByText("2.100.000 ₫").first()).toBeVisible();
        await expect(
          page.getByText(/700\.000 ₫ \/ lượt × 3 lượt/u)
        ).toBeVisible();
      });

      // -------------------------------------------------------------
      // Step 3: Accumulation from Listing Page
      // -------------------------------------------------------------
      await test.step("add 2 more units of same service from listing page and verify accumulation", async () => {
        await page.goto(`/listing/${SERVICE_LISTING_ID}`);

        const quantityInput = page.getByRole("spinbutton", {
          name: "Số lượng muốn mua",
        });
        const plusBtn = page.getByRole("button", {
          name: "Tăng Số lượng muốn mua",
        });

        // Page loads fresh quantity 1, step up to 2
        await expect(quantityInput).toHaveValue("1");
        await plusBtn.click();
        await expect(quantityInput).toHaveValue("2");

        // Add 2 more units
        await page.getByRole("button", { name: "Thêm vào giỏ" }).click();
        await expect(page).toHaveURL(/\/cart(?:\?|$)/u);

        // Accumulated: 3 + 2 = 5 units
        // Line total: 700k * 5 = 3.500.000 ₫
        await expect(page.getByText("3.500.000 ₫").first()).toBeVisible();
        await expect(
          page.getByText(/700\.000 ₫ \/ lượt × 5 lượt/u)
        ).toBeVisible();
      });

      // -------------------------------------------------------------
      // Step 4: Checkout and verify Order Detail & Rate Breakdown
      // -------------------------------------------------------------
      await test.step("complete checkout and verify order views display quantity and rate breakdown", async () => {
        const checkoutSubmitBtn = page.getByRole("button", {
          name: "Thanh toán an toàn",
        });
        await expect(checkoutSubmitBtn).toBeEnabled();
        await checkoutSubmitBtn.click();

        // Wait for redirect to /orders
        await expect(page).toHaveURL(/\/orders(?:\?|$)/u, { timeout: 15_000 });
        await expect(
          page.getByRole("heading", { level: 1, name: "Đơn hàng của tôi" })
        ).toBeVisible();

        // In Buyer Orders Table:
        // Quantity cell displays "x5"
        await expect(page.getByText("x5").first()).toBeVisible();
        // Total amount 3.500.000 ₫
        await expect(page.getByText("3.500.000 ₫").first()).toBeVisible();
        // Rate breakdown "700.000 ₫ / lượt"
        await expect(
          page.getByText(/700\.000 ₫ \/ lượt/u).first()
        ).toBeVisible();

        // Click into order detail page via table row
        await page.getByText(SERVICE_LISTING_TITLE).first().click();

        await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+(?:\?|$)/u);

        // On /orders/$id:
        // Top summary displays total and (SL: 5)
        await expect(page.getByText("(SL: 5)").first()).toBeVisible();

        // Buyer order item card displays quantity and rate breakdown:
        // (SL: 5 · 700.000 ₫ / lượt)
        await expect(
          page.getByText(/SL: 5 · 700\.000 ₫ \/ lượt/u)
        ).toBeVisible();
      });
    });
  }
);
