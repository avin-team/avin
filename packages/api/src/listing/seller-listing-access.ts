import type { db } from "@avin/db";
import { user as userTable } from "@avin/db/schema/auth";
import { sellerApplication } from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import { getSellerEnforcement } from "../seller-enforcement/access";
import { isSellerEnforced } from "../seller-store/profile";

export const CURRENT_SELLER_AGREEMENT_VERSION = "v1.0";

export const assertEligibleSeller = async (
  database: Pick<typeof db, "query">,
  sellerId: string
): Promise<void> => {
  const [account, application, enforcement] = await Promise.all([
    database.query.user.findFirst({ where: eq(userTable.id, sellerId) }),
    database.query.sellerApplication.findFirst({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      where: eq(sellerApplication.userId, sellerId),
    }),
    getSellerEnforcement(database, sellerId),
  ]);

  const enforced = isSellerEnforced(
    account
      ? {
          sellerEnforcementExpiresAt: enforcement?.expiresAt,
          sellerEnforcementState: enforcement?.state,
        }
      : null
  );
  if (
    !account ||
    account.role !== "SELLER" ||
    enforced ||
    application?.status !== "APPROVED" ||
    application.sellerAgreementVersion !== CURRENT_SELLER_AGREEMENT_VERSION
  ) {
    throw new ORPCError("FORBIDDEN", {
      message: "Seller access is not available for this account",
    });
  }
};
