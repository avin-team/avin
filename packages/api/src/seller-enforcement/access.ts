import { sellerEnforcement } from "@avin/db/schema/seller-enforcement";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "../runtime/context";
import { isSellerEnforcementActive } from "./policy";
import type {
  SellerEnforcementSnapshot,
  SellerEnforcementState,
} from "./policy";

export interface MarketplaceSellerAccount extends SellerEnforcementSnapshot {
  sellerId: string;
}

interface SellerEnforcementQuery {
  findFirst: (input: unknown) => Promise<MarketplaceSellerAccount | null>;
}

const isSellerEnforcementQuery = (
  value: unknown
): value is SellerEnforcementQuery => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return typeof Reflect.get(value, "findFirst") === "function";
};

const getSellerEnforcementQuery = (
  database: Context["db"]
): SellerEnforcementQuery | undefined => {
  const queryContainer = Reflect.get(database, "query");
  if (typeof queryContainer !== "object" || queryContainer === null) {
    return undefined;
  }

  const query = Reflect.get(queryContainer, "sellerEnforcement");
  return isSellerEnforcementQuery(query) ? query : undefined;
};

export const getSellerEnforcement = async (
  database: Context["db"],
  sellerId: string
): Promise<MarketplaceSellerAccount | null> => {
  const query = getSellerEnforcementQuery(database);
  if (!query) {
    return null;
  }

  const enforcement = await query.findFirst({
    where: eq(sellerEnforcement.sellerId, sellerId),
  });

  // A missing row is the normal CLEAR state. Returning it explicitly keeps
  // marketplace enforcement independent from Better Auth's account-lock
  // fields while still allowing lightweight test doubles without a query API.
  return enforcement ?? { expiresAt: null, sellerId, state: "CLEAR" };
};

export const getSellerEnforcementState = async (
  database: Context["db"],
  sellerId: string
): Promise<SellerEnforcementState> => {
  const enforcement = await getSellerEnforcement(database, sellerId);
  return enforcement?.state ?? "CLEAR";
};

export const isMarketplaceSellerEnforced = (
  enforcement: SellerEnforcementSnapshot | null | undefined,
  now = new Date()
): boolean =>
  enforcement ? isSellerEnforcementActive(enforcement, now) : false;

export const assertMarketplaceSellerNotEnforced = async (
  database: Context["db"],
  sellerId: string,
  now = new Date()
): Promise<void> => {
  const enforcement = await getSellerEnforcement(database, sellerId);
  if (isMarketplaceSellerEnforced(enforcement, now)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Seller access is not available while enforcement is active",
    });
  }
};
