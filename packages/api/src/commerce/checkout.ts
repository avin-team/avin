/* eslint-disable no-await-in-loop, react-doctor/async-await-in-loop */

import type { db } from "@avin/db";
import { user as userTable } from "@avin/db/schema/auth";
import {
  listing,
  parentCategory,
  servicePackage,
  subCategory,
} from "@avin/db/schema/catalog";
import type { WarrantyPolicy } from "@avin/db/schema/catalog";
import {
  cart,
  cartItem,
  checkout,
  checkoutAttachmentDraft,
  escrowHold,
  order,
  orderFile,
  orderItem,
  orderItemLifecycleEvent,
} from "@avin/db/schema/commerce";
import type { OrderItemStatus } from "@avin/db/schema/commerce";
import { sellerEnforcement } from "@avin/db/schema/seller-enforcement";
import { userWallet } from "@avin/db/schema/wallet";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";

import { isListingPubliclyAvailable } from "../listing/listing-discovery";
import { COMMERCE_IMAGE_MAX_COUNT } from "../runtime/storage";
import { isSellerEnforcementActive } from "../seller-enforcement/policy";
import { recordBalancedLedgerTransaction } from "../wallet/ledger";
import { ensureWalletAccounts } from "../wallet/service";
import type { CommerceExecutor } from "./cart";
import type { CheckoutInput } from "./checkout-input";
import {
  fingerprintCheckoutRequest,
  parseListingContract,
  parseServicePackageContract,
} from "./contracts";

export { checkoutInputSchema } from "./checkout-input";
export type { CheckoutInput } from "./checkout-input";

type CheckoutItemInput = CheckoutInput["items"][number];

export interface CheckoutResult {
  checkoutId: string;
  orders: {
    id: string;
    items: {
      escrowHoldId: string;
      escrowHoldStatus: "CANCELLED" | "HELD" | "REFUNDED" | "RELEASED";
      id: string;
      listingId: string;
      priceAmount: number;
      servicePackageId: string | null;
      status: OrderItemStatus;
    }[];
    sellerId: string;
    totalAmount: number;
  }[];
  purchaseTransactionId: string;
  totalAmount: number;
}

interface SelectedListingRow {
  cartId: string;
  cartItemId: string;
  categoryId: string;
  categoryStatus: "ACTIVE" | "ARCHIVED" | "HIDDEN";
  commissionRatePercent: string;
  description: string | null;
  images: string[] | null;
  listingId: string;
  listingPriceAmount: number | null;
  listingSlug: string;
  listingStatus: "ARCHIVED" | "DRAFT" | "HIDDEN" | "PAUSED" | "PUBLISHED";
  listingThumbnailUrl: string | null;
  listingTitle: string | null;
  listingType: "COURSE" | "SERVICE";
  parentCategoryStatus: "ACTIVE" | "ARCHIVED" | "HIDDEN";
  processingTimeHours: number | null;
  selectedPackageId: string | null;
  servicePackageDescription: string | null;
  servicePackageId: string | null;
  servicePackageListingId: string | null;
  servicePackageName: string | null;
  servicePackagePriceAmount: number | null;
  servicePackageProcessingTimeHours: number | null;
  servicePackageStatus: "AVAILABLE" | "UNAVAILABLE" | null;
  servicePackageWarrantyPolicy: WarrantyPolicy | null;
  sellerEnforcementExpiresAt: Date | null;
  sellerEnforcementState: "BANNED" | "CLEAR" | "SUSPENDED" | null;
  sellerId: string;
  warrantyDurationHours: number | null;
  warrantyTerms: string | null;
}

interface PreparedCheckoutItem {
  buyerDescription: string;
  contract: ReturnType<typeof parseListingContract>;
  row: SelectedListingRow;
}

const createPurchaseTransactionReference = (): string =>
  `AVTX-PURCHASE-${crypto.randomUUID().replaceAll("-", "").toUpperCase()}`;

const getSelectedListingRows = async (
  executor: CommerceExecutor,
  userId: string
): Promise<SelectedListingRow[]> => {
  const rows = await executor
    .select({
      cartId: cart.id,
      cartItemId: cartItem.id,
      categoryId: subCategory.id,
      categoryStatus: subCategory.status,
      commissionRatePercent: subCategory.commissionRatePercent,
      description: listing.description,
      images: listing.images,
      listingId: listing.id,
      listingPriceAmount: listing.priceAmount,
      listingSlug: listing.slug,
      listingStatus: listing.status,
      listingThumbnailUrl: listing.thumbnailUrl,
      listingTitle: listing.title,
      listingType: listing.type,
      parentCategoryStatus: parentCategory.status,
      processingTimeHours: listing.processingTimeHours,
      selectedPackageId: cartItem.servicePackageId,
      sellerEnforcementExpiresAt: sellerEnforcement.expiresAt,
      sellerEnforcementState: sellerEnforcement.state,
      sellerId: listing.sellerId,
      servicePackageDescription: servicePackage.description,
      servicePackageId: servicePackage.id,
      servicePackageListingId: servicePackage.listingId,
      servicePackageName: servicePackage.name,
      servicePackagePriceAmount: servicePackage.priceAmount,
      servicePackageProcessingTimeHours: servicePackage.processingTimeHours,
      servicePackageStatus: servicePackage.status,
      servicePackageWarrantyPolicy: servicePackage.warrantyPolicy,
      warrantyDurationHours: listing.warrantyDurationHours,
      warrantyTerms: listing.warrantyTerms,
    })
    .from(cartItem)
    .innerJoin(cart, eq(cartItem.cartId, cart.id))
    .innerJoin(listing, eq(cartItem.listingId, listing.id))
    .innerJoin(subCategory, eq(listing.categoryId, subCategory.id))
    .innerJoin(parentCategory, eq(subCategory.parentId, parentCategory.id))
    .leftJoin(
      sellerEnforcement,
      eq(listing.sellerId, sellerEnforcement.sellerId)
    )
    .leftJoin(servicePackage, eq(cartItem.servicePackageId, servicePackage.id))
    .where(and(eq(cart.userId, userId), eq(cartItem.selected, true)))
    .orderBy(asc(cartItem.createdAt), asc(cartItem.id))
    .for("update", { of: cartItem });

  const serviceListingIds: string[] = [];
  for (const row of rows) {
    if (row.listingType === "SERVICE") {
      serviceListingIds.push(row.listingId);
    }
  }
  if (serviceListingIds.length === 0) {
    return rows;
  }

  const packageRows = await executor
    .select()
    .from(servicePackage)
    .where(inArray(servicePackage.listingId, serviceListingIds))
    .for("update");
  const packagesById = new Map(
    packageRows.map((packageRow) => [packageRow.id, packageRow])
  );
  const packagesByListing = new Map<string, typeof packageRows>();
  for (const packageRow of packageRows) {
    const listingPackages = packagesByListing.get(packageRow.listingId) ?? [];
    listingPackages.push(packageRow);
    packagesByListing.set(packageRow.listingId, listingPackages);
  }

  for (const row of rows) {
    if (row.listingType !== "SERVICE") {
      continue;
    }

    let selectedPackage = row.selectedPackageId
      ? packagesById.get(row.selectedPackageId)
      : undefined;
    if (!row.selectedPackageId) {
      const availablePackages = (
        packagesByListing.get(row.listingId) ?? []
      ).filter((packageRow) => packageRow.status === "AVAILABLE");
      const [onlyAvailablePackage] = availablePackages;
      if (availablePackages.length === 1 && onlyAvailablePackage) {
        selectedPackage = onlyAvailablePackage;
        row.selectedPackageId = onlyAvailablePackage.id;
      }
    }

    if (!selectedPackage) {
      continue;
    }
    row.servicePackageDescription = selectedPackage.description;
    row.servicePackageId = selectedPackage.id;
    row.servicePackageListingId = selectedPackage.listingId;
    row.servicePackageName = selectedPackage.name;
    row.servicePackagePriceAmount = selectedPackage.priceAmount;
    row.servicePackageProcessingTimeHours = selectedPackage.processingTimeHours;
    row.servicePackageStatus = selectedPackage.status;
    row.servicePackageWarrantyPolicy = selectedPackage.warrantyPolicy;
  }

  return rows;
};

const getCheckoutByIdempotencyKey = async (
  executor: CommerceExecutor,
  userId: string,
  idempotencyKey: string
): Promise<typeof checkout.$inferSelect | undefined> => {
  const [found] = await executor
    .select()
    .from(checkout)
    .where(
      and(
        eq(checkout.userId, userId),
        eq(checkout.idempotencyKey, idempotencyKey)
      )
    )
    .for("update")
    .limit(1);

  return found;
};

export const getCheckoutResult = async (
  executor: CommerceExecutor,
  checkoutId: string
): Promise<CheckoutResult> => {
  const [checkoutRow] = await executor
    .select()
    .from(checkout)
    .where(eq(checkout.id, checkoutId))
    .limit(1);

  if (!checkoutRow) {
    throw new ORPCError("NOT_FOUND", {
      message: "Checkout không tồn tại.",
    });
  }

  const orders = await executor
    .select({
      id: order.id,
      sellerId: order.sellerId,
      totalAmount: order.totalAmount,
    })
    .from(order)
    .where(eq(order.checkoutId, checkoutId))
    .orderBy(asc(order.createdAt), asc(order.id));

  const orderIds = orders.map((item) => item.id);
  const items = orderIds.length
    ? await executor
        .select({
          escrowHoldId: escrowHold.id,
          escrowHoldStatus: escrowHold.status,
          id: orderItem.id,
          listingId: orderItem.listingId,
          orderId: orderItem.orderId,
          priceAmount: orderItem.priceAmount,
          servicePackageId: orderItem.servicePackageId,
          status: orderItem.status,
        })
        .from(orderItem)
        .innerJoin(escrowHold, eq(escrowHold.orderItemId, orderItem.id))
        .where(inArray(orderItem.orderId, orderIds))
        .orderBy(asc(orderItem.createdAt), asc(orderItem.id))
    : [];

  const itemsByOrder = new Map<
    string,
    CheckoutResult["orders"][number]["items"]
  >();
  for (const item of items) {
    const orderItems = itemsByOrder.get(item.orderId) ?? [];
    orderItems.push({
      escrowHoldId: item.escrowHoldId,
      escrowHoldStatus: item.escrowHoldStatus,
      id: item.id,
      listingId: item.listingId,
      priceAmount: item.priceAmount,
      servicePackageId: item.servicePackageId,
      status: item.status,
    });
    itemsByOrder.set(item.orderId, orderItems);
  }

  return {
    checkoutId: checkoutRow.id,
    orders: orders.map((item) => ({
      id: item.id,
      items: itemsByOrder.get(item.id) ?? [],
      sellerId: item.sellerId,
      totalAmount: item.totalAmount,
    })),
    purchaseTransactionId: checkoutRow.purchaseTransactionId,
    totalAmount: checkoutRow.totalAmount,
  };
};

const assertSelectedItemsMatchRequest = (
  rows: SelectedListingRow[],
  input: CheckoutInput
): Map<string, CheckoutItemInput> => {
  const requestedItems = new Map(
    input.items.map((item) => [item.listingId, item])
  );
  if (
    rows.length !== requestedItems.size ||
    rows.some((row) => !requestedItems.has(row.listingId))
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Checkout items must exactly match the selected Cart entries. Update the Cart and try again.",
    });
  }
  return requestedItems;
};

// oxlint-disable-next-line complexity
const prepareCheckoutItems = (
  rows: SelectedListingRow[],
  requestedItems: Map<string, CheckoutItemInput>,
  confirmMaterialChanges: boolean,
  now: Date
): PreparedCheckoutItem[] => {
  const prepared: PreparedCheckoutItem[] = [];
  for (const row of rows) {
    const requestedItem = requestedItems.get(row.listingId);
    if (!requestedItem) {
      throw new Error("Checkout request item was not found");
    }

    const sellerAvailable = !isSellerEnforcementActive(
      {
        expiresAt: row.sellerEnforcementExpiresAt,
        state: row.sellerEnforcementState ?? "CLEAR",
      },
      now
    );
    if (
      !sellerAvailable ||
      !isListingPubliclyAvailable(
        row.listingStatus,
        row.categoryStatus,
        row.parentCategoryStatus
      )
    ) {
      throw new ORPCError("CONFLICT", {
        message: "Một Listing đã không còn khả dụng. Hãy cập nhật Cart.",
      });
    }

    let contract: ReturnType<typeof parseListingContract>;
    if (row.listingType === "SERVICE") {
      if (
        requestedItem.packageId &&
        requestedItem.packageId !== row.selectedPackageId
      ) {
        throw new ORPCError("CONFLICT", {
          message:
            "Selected Service package changed. Update the Cart and try again.",
        });
      }
      if (
        !row.selectedPackageId ||
        row.servicePackageId !== row.selectedPackageId ||
        row.servicePackageListingId !== row.listingId ||
        !row.servicePackageName ||
        !row.servicePackageDescription ||
        row.servicePackagePriceAmount === null ||
        row.servicePackageProcessingTimeHours === null ||
        row.servicePackageStatus !== "AVAILABLE" ||
        !row.servicePackageWarrantyPolicy
      ) {
        throw new ORPCError("CONFLICT", {
          message:
            "A Service package must be selected before this Listing can be purchased.",
        });
      }
      contract = parseServicePackageContract(
        {
          categoryId: row.categoryId,
          description: row.description,
          images: row.images,
          sellerId: row.sellerId,
          slug: row.listingSlug,
          thumbnailUrl: row.listingThumbnailUrl,
          title: row.listingTitle,
          type: row.listingType,
        },
        {
          description: row.servicePackageDescription,
          id: row.servicePackageId,
          name: row.servicePackageName,
          priceAmount: row.servicePackagePriceAmount,
          processingTimeHours: row.servicePackageProcessingTimeHours,
          warrantyPolicy: row.servicePackageWarrantyPolicy,
        },
        row.commissionRatePercent
      );
    } else {
      if (requestedItem.packageId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Course listings do not have Service packages.",
        });
      }
      contract = parseListingContract(
        {
          categoryId: row.categoryId,
          description: row.description,
          images: row.images,
          priceAmount: row.listingPriceAmount,
          processingTimeHours: row.processingTimeHours,
          sellerId: row.sellerId,
          slug: row.listingSlug,
          thumbnailUrl: row.listingThumbnailUrl,
          title: row.listingTitle,
          type: row.listingType,
          warrantyDurationHours: row.warrantyDurationHours,
          warrantyTerms: row.warrantyTerms,
        },
        row.commissionRatePercent
      );
    }

    if (
      contract.fingerprint !== requestedItem.contractFingerprint &&
      !confirmMaterialChanges
    ) {
      throw new ORPCError("CONFLICT", {
        message:
          "Listing contract đã thay đổi. Hãy xem lại Cart và xác nhận lại trước khi thanh toán.",
      });
    }

    prepared.push({
      buyerDescription: requestedItem.description ?? "",
      contract,
      row,
    });
  }

  return prepared;
};

const createOrdersAndEscrowHolds = async (
  transaction: CommerceExecutor,
  checkoutId: string,
  buyerId: string,
  purchaseTransactionId: string,
  items: PreparedCheckoutItem[],
  checkoutKey: string,
  now: Date
): Promise<void> => {
  const itemsBySeller = new Map<string, PreparedCheckoutItem[]>();
  for (const item of items) {
    const sellerItems = itemsBySeller.get(item.row.sellerId) ?? [];
    sellerItems.push(item);
    itemsBySeller.set(item.row.sellerId, sellerItems);
  }

  for (const [sellerId, sellerItems] of itemsBySeller) {
    let totalAmount = 0;
    for (const { contract } of sellerItems) {
      totalAmount += contract.priceAmount;
    }
    const [createdOrder] = await transaction
      .insert(order)
      .values({
        buyerId,
        checkoutId,
        sellerId,
        totalAmount,
      })
      .returning({ id: order.id });

    if (!createdOrder) {
      throw new Error("Order was not created");
    }

    for (const { buyerDescription, contract, row } of sellerItems) {
      const {
        commissionRatePercent,
        listingSnapshot,
        priceAmount,
        processingTimeHours,
        warrantyPolicy,
      } = contract;
      const [createdItem] = await transaction
        .insert(orderItem)
        .values({
          buyerDescription: buyerDescription || null,
          commissionRatePercent,
          listingId: row.listingId,
          listingSnapshot,
          orderId: createdOrder.id,
          priceAmount,
          processingDeadlineAt: new Date(
            now.getTime() + processingTimeHours * 60 * 60 * 1000
          ),
          processingTimeHours,
          servicePackageId: contract.servicePackageId ?? null,
          servicePackageSnapshot: contract.servicePackageSnapshot ?? null,
          warrantyPolicy,
        })
        .returning({ id: orderItem.id });

      if (!createdItem) {
        throw new Error("OrderItem was not created");
      }

      const attachments = await transaction
        .select()
        .from(checkoutAttachmentDraft)
        .where(
          and(
            eq(checkoutAttachmentDraft.checkoutKey, checkoutKey),
            eq(checkoutAttachmentDraft.listingId, row.listingId),
            eq(checkoutAttachmentDraft.userId, buyerId)
          )
        );
      if (attachments.length > COMMERCE_IMAGE_MAX_COUNT) {
        throw new ORPCError("CONFLICT", {
          message: `Mỗi Listing chỉ được đính kèm tối đa ${COMMERCE_IMAGE_MAX_COUNT} ảnh.`,
        });
      }
      if (attachments.length > 0) {
        await transaction.insert(orderFile).values(
          attachments.map((attachment) => ({
            byteSize: attachment.byteSize,
            contentType: attachment.contentType,
            fileName: attachment.fileName,
            orderId: createdOrder.id,
            orderItemId: createdItem.id,
            storageKey: attachment.storageKey,
            uploadedByUserId: buyerId,
          }))
        );
        await transaction
          .delete(checkoutAttachmentDraft)
          .where(
            and(
              eq(checkoutAttachmentDraft.checkoutKey, checkoutKey),
              eq(checkoutAttachmentDraft.listingId, row.listingId),
              eq(checkoutAttachmentDraft.userId, buyerId)
            )
          );
      }

      await transaction.insert(orderItemLifecycleEvent).values({
        actorType: "BUYER",
        actorUserId: buyerId,
        artifactId: checkoutId,
        artifactType: "CHECKOUT",
        commandKey: `checkout:${checkoutId}`,
        createdAt: now,
        effectiveAt: now,
        newStatus: "AWAITING_SELLER",
        orderItemId: createdItem.id,
        reason: "Checkout created OrderItem",
      });

      await transaction.insert(escrowHold).values({
        amount: priceAmount,
        orderItemId: createdItem.id,
        purchaseTransactionId,
        status: "HELD",
      });
    }
  }
};

export const createCheckout = (
  database: typeof db,
  userId: string,
  input: CheckoutInput,
  now = new Date()
): Promise<CheckoutResult> =>
  // oxlint-disable-next-line complexity
  database.transaction(async (transaction) => {
    const [account] = await transaction
      .select({ id: userTable.id, role: userTable.role })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .for("update")
      .limit(1);

    if (!account || account.role !== "BUYER") {
      throw new ORPCError("FORBIDDEN", {
        message: "Chỉ Buyer mới có thể Checkout.",
      });
    }

    const requestFingerprint = fingerprintCheckoutRequest(input);
    const existingCheckout = await getCheckoutByIdempotencyKey(
      transaction,
      userId,
      input.idempotencyKey
    );
    if (existingCheckout) {
      if (existingCheckout.requestFingerprint !== requestFingerprint) {
        throw new ORPCError("CONFLICT", {
          message: "Idempotency key đã được dùng cho một Checkout khác.",
        });
      }
      return getCheckoutResult(transaction, existingCheckout.id);
    }

    const selectedRows = await getSelectedListingRows(transaction, userId);
    if (selectedRows.length === 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cart chưa có Listing nào được chọn.",
      });
    }

    const sellerIds = [
      ...new Set(selectedRows.map((selected) => selected.sellerId)),
    ];
    // Seller Enforcement and Checkout serialize on the Seller account row.
    // The fresh snapshot below ensures a ban that commits first is observed,
    // while a Checkout that acquires the lock first remains authoritative.
    await transaction
      .select({ id: userTable.id })
      .from(userTable)
      .where(inArray(userTable.id, sellerIds))
      .for("update");
    const enforcementRows = await transaction
      .select({
        expiresAt: sellerEnforcement.expiresAt,
        sellerId: sellerEnforcement.sellerId,
        state: sellerEnforcement.state,
      })
      .from(sellerEnforcement)
      .where(inArray(sellerEnforcement.sellerId, sellerIds));
    const enforcementBySeller = new Map(
      enforcementRows.map((enforcement) => [enforcement.sellerId, enforcement])
    );
    for (const selectedRow of selectedRows) {
      const enforcement = enforcementBySeller.get(selectedRow.sellerId);
      selectedRow.sellerEnforcementExpiresAt = enforcement?.expiresAt ?? null;
      selectedRow.sellerEnforcementState = enforcement?.state ?? null;
    }

    const requestedItems = assertSelectedItemsMatchRequest(selectedRows, input);
    const preparedItems = prepareCheckoutItems(
      selectedRows,
      requestedItems,
      input.confirmMaterialChanges,
      now
    );
    let totalAmount = 0;
    for (const { contract } of preparedItems) {
      totalAmount += contract.priceAmount;
    }

    const accounts = await ensureWalletAccounts(transaction, userId);
    const [wallet] = await transaction
      .select()
      .from(userWallet)
      .where(eq(userWallet.id, accounts.wallet.id))
      .for("update")
      .limit(1);
    if (!wallet || wallet.availableBalance < totalAmount) {
      throw new ORPCError("CONFLICT", {
        message: "Số dư Available Balance không đủ để Checkout.",
      });
    }

    const purchaseTransaction = await recordBalancedLedgerTransaction(
      transaction,
      {
        amount: totalAmount,
        description: `PURCHASE_HOLD ${input.idempotencyKey}`,
        postings: [
          {
            accountId: accounts.availableAccount.id,
            debitAmount: totalAmount,
          },
          {
            accountId: accounts.heldAccount.id,
            creditAmount: totalAmount,
          },
        ],
        reference: createPurchaseTransactionReference(),
        type: "PURCHASE_HOLD",
      }
    );
    // eslint-disable-next-line react-doctor/server-sequential-independent-await
    const [updatedWallet] = await transaction
      .update(userWallet)
      .set({
        availableBalance: sql`${userWallet.availableBalance} - ${totalAmount}`,
        heldBalance: sql`${userWallet.heldBalance} + ${totalAmount}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(userWallet.id, accounts.wallet.id),
          gte(userWallet.availableBalance, totalAmount)
        )
      )
      .returning({
        availableBalance: userWallet.availableBalance,
        heldBalance: userWallet.heldBalance,
      });

    if (!updatedWallet) {
      throw new ORPCError("CONFLICT", {
        message: "Số dư Available Balance vừa thay đổi. Vui lòng thử lại.",
      });
    }

    const availablePosting = purchaseTransaction.postings.find(
      (posting) => posting.accountId === accounts.availableAccount.id
    );
    const heldPosting = purchaseTransaction.postings.find(
      (posting) => posting.accountId === accounts.heldAccount.id
    );
    if (
      availablePosting?.balanceAfter !== updatedWallet.availableBalance ||
      heldPosting?.balanceAfter !== updatedWallet.heldBalance
    ) {
      throw new Error("Ledger and wallet balances are out of sync");
    }

    const [checkoutRow] = await transaction
      .insert(checkout)
      .values({
        idempotencyKey: input.idempotencyKey,
        purchaseTransactionId: purchaseTransaction.id,
        requestFingerprint,
        totalAmount,
        userId,
      })
      .returning({ id: checkout.id });
    if (!checkoutRow) {
      throw new Error("Checkout was not created");
    }

    await createOrdersAndEscrowHolds(
      transaction,
      checkoutRow.id,
      userId,
      purchaseTransaction.id,
      preparedItems,
      input.idempotencyKey,
      now
    );

    const cartId = selectedRows[0]?.cartId;
    if (!cartId) {
      throw new Error("Selected Cart entries have no Cart owner");
    }

    const deletedCartItems = await transaction
      .delete(cartItem)
      .where(
        and(
          eq(cartItem.cartId, cartId),
          eq(cartItem.selected, true),
          inArray(
            cartItem.listingId,
            selectedRows.map((item) => item.listingId)
          )
        )
      )
      .returning({ id: cartItem.id });
    if (deletedCartItems.length !== selectedRows.length) {
      throw new Error("Selected Cart entries could not be consumed atomically");
    }

    return getCheckoutResult(transaction, checkoutRow.id);
  });
