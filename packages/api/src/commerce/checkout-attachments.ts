import { db } from "@avin/db";
import {
  cart,
  cartItem,
  checkoutAttachmentDraft,
} from "@avin/db/schema/commerce";
import { ORPCError } from "@orpc/server";
import { and, eq, lte } from "drizzle-orm";
import { z } from "zod";

import { readAdvisorAttachmentBytes } from "../advisor/attachments";
import type { AdvisorAttachmentRecord } from "../advisor/attachments";
import type { ManagedObjectStore } from "../runtime/storage";
import {
  COMMERCE_IMAGE_CONTENT_TYPES,
  COMMERCE_IMAGE_MAX_BYTES,
  COMMERCE_IMAGE_MAX_COUNT,
  ORDER_FILES_BUCKET,
  createCheckoutAttachmentKey,
  isCheckoutAttachmentKey,
} from "../runtime/storage";
import { deleteOrderFileObject } from "./private-storage";

export { CHECKOUT_ATTACHMENT_UPLOAD_ROUTE } from "../runtime/storage";

const FILE_NAME_MAX_LENGTH = 255;
const STORAGE_KEY_MAX_LENGTH = 512;
const DRAFT_RETENTION_MS = 24 * 60 * 60 * 1000;
const DRAFT_CLEANUP_LIMIT = 100;

const isCommerceImageContentType = (
  value: string
): value is (typeof COMMERCE_IMAGE_CONTENT_TYPES)[number] =>
  COMMERCE_IMAGE_CONTENT_TYPES.includes(
    value as (typeof COMMERCE_IMAGE_CONTENT_TYPES)[number]
  );

export const checkoutAttachmentInputSchema = z.object({
  byteSize: z.number().int().positive().max(COMMERCE_IMAGE_MAX_BYTES),
  checkoutKey: z.uuid(),
  contentType: z.string().trim().min(1).max(255),
  fileName: z.string().trim().min(1).max(FILE_NAME_MAX_LENGTH),
  listingId: z.uuid(),
  storageKey: z.string().trim().min(1).max(STORAGE_KEY_MAX_LENGTH),
});

export type CheckoutAttachmentInput = z.infer<
  typeof checkoutAttachmentInputSchema
>;

export interface CheckoutAttachmentCleanupOptions {
  database?: typeof db;
  deleteObject?: (storageKey: string) => Promise<void>;
  now?: Date;
}

export const assertBuyerCartListing = async (
  database: typeof db,
  buyerId: string,
  listingId: string
): Promise<void> => {
  const [cartEntry] = await database
    .select({ id: cartItem.id })
    .from(cartItem)
    .innerJoin(cart, eq(cart.id, cartItem.cartId))
    .where(
      and(
        eq(cart.userId, buyerId),
        eq(cartItem.listingId, listingId),
        eq(cartItem.selected, true)
      )
    )
    .for("update")
    .limit(1);
  if (!cartEntry) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing không thuộc Cart của bạn.",
    });
  }
};

export const createCheckoutAttachment = async ({
  database = db,
  input,
  buyerId,
  storage,
}: {
  buyerId: string;
  database?: typeof db;
  input: CheckoutAttachmentInput;
  storage?: ManagedObjectStore;
}) => {
  const parsedInput = checkoutAttachmentInputSchema.parse(input);
  if (!isCommerceImageContentType(parsedInput.contentType)) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Ảnh chỉ hỗ trợ JPEG, PNG hoặc WebP.",
    });
  }
  if (
    !isCheckoutAttachmentKey(
      parsedInput.storageKey,
      parsedInput.checkoutKey,
      buyerId,
      parsedInput.listingId
    )
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Đường dẫn ảnh Checkout không hợp lệ.",
    });
  }

  try {
    await assertBuyerCartListing(database, buyerId, parsedInput.listingId);
    const existing = await database
      .select({ id: checkoutAttachmentDraft.id })
      .from(checkoutAttachmentDraft)
      .where(
        and(
          eq(checkoutAttachmentDraft.checkoutKey, parsedInput.checkoutKey),
          eq(checkoutAttachmentDraft.listingId, parsedInput.listingId),
          eq(checkoutAttachmentDraft.userId, buyerId)
        )
      );
    if (existing.length >= COMMERCE_IMAGE_MAX_COUNT) {
      throw new ORPCError("BAD_REQUEST", {
        message: `Mỗi Listing chỉ được đính kèm tối đa ${COMMERCE_IMAGE_MAX_COUNT} ảnh.`,
      });
    }

    const [attachment] = await database
      .insert(checkoutAttachmentDraft)
      .values({
        byteSize: parsedInput.byteSize,
        checkoutKey: parsedInput.checkoutKey,
        contentType: parsedInput.contentType,
        fileName: parsedInput.fileName,
        listingId: parsedInput.listingId,
        storageKey: parsedInput.storageKey,
        userId: buyerId,
      })
      .returning();
    if (!attachment) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Không thể lưu ảnh Checkout.",
      });
    }
    return attachment;
  } catch (error) {
    try {
      const [persisted] = await database
        .select({ id: checkoutAttachmentDraft.id })
        .from(checkoutAttachmentDraft)
        .where(
          and(
            eq(checkoutAttachmentDraft.storageKey, parsedInput.storageKey),
            eq(checkoutAttachmentDraft.userId, buyerId)
          )
        )
        .limit(1);
      if (!persisted) {
        await deleteOrderFileObject(parsedInput.storageKey, storage);
      }
    } catch {
      // Maintenance retries persisted drafts; an untracked object is best-effort cleanup.
    }
    throw error;
  }
};

export const copyAdvisorAttachmentToCheckout = async ({
  advisorAttachment,
  buyerId,
  checkoutKey,
  database = db,
  listingId,
  storage,
}: {
  advisorAttachment: AdvisorAttachmentRecord;
  buyerId: string;
  checkoutKey: string;
  database?: typeof db;
  listingId: string;
  storage?: ManagedObjectStore;
}) => {
  if (!storage?.getObject || !storage.putObject) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Checkout image storage is temporarily unavailable.",
    });
  }
  if (!isCommerceImageContentType(advisorAttachment.contentType)) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Ảnh chỉ hỗ trợ JPEG, PNG hoặc WebP.",
    });
  }

  await assertBuyerCartListing(database, buyerId, listingId);
  const storageKey = createCheckoutAttachmentKey(
    checkoutKey,
    buyerId,
    listingId,
    advisorAttachment.contentType,
    advisorAttachment.id
  );
  const [existingAttachment] = await database
    .select()
    .from(checkoutAttachmentDraft)
    .where(
      and(
        eq(checkoutAttachmentDraft.storageKey, storageKey),
        eq(checkoutAttachmentDraft.userId, buyerId)
      )
    )
    .limit(1);
  if (existingAttachment) {
    return existingAttachment;
  }
  const existing = await database
    .select({ id: checkoutAttachmentDraft.id })
    .from(checkoutAttachmentDraft)
    .where(
      and(
        eq(checkoutAttachmentDraft.checkoutKey, checkoutKey),
        eq(checkoutAttachmentDraft.listingId, listingId),
        eq(checkoutAttachmentDraft.userId, buyerId)
      )
    );
  if (existing.length >= COMMERCE_IMAGE_MAX_COUNT) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Mỗi Listing chỉ được đính kèm tối đa ${COMMERCE_IMAGE_MAX_COUNT} ảnh.`,
    });
  }

  const bytes = await readAdvisorAttachmentBytes({
    attachment: advisorAttachment,
    storage,
  });
  if (bytes.byteLength === 0 || bytes.byteLength > COMMERCE_IMAGE_MAX_BYTES) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Ảnh Advisor không còn hợp lệ để đưa vào Checkout.",
    });
  }

  await storage.putObject(
    storageKey,
    bytes,
    advisorAttachment.contentType,
    ORDER_FILES_BUCKET
  );
  try {
    const [attachment] = await database
      .insert(checkoutAttachmentDraft)
      .values({
        byteSize: bytes.byteLength,
        checkoutKey,
        contentType: advisorAttachment.contentType,
        fileName: advisorAttachment.fileName,
        listingId,
        storageKey,
        userId: buyerId,
      })
      .returning();
    if (!attachment) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Không thể lưu ảnh Checkout.",
      });
    }
    return attachment;
  } catch (error) {
    await deleteOrderFileObject(storageKey, storage);
    throw error;
  }
};

export const discardCheckoutAttachment = async ({
  attachmentId,
  buyerId,
  database = db,
  storage,
}: {
  attachmentId: string;
  buyerId: string;
  database?: typeof db;
  storage?: ManagedObjectStore;
}): Promise<void> => {
  const [attachment] = await database
    .select()
    .from(checkoutAttachmentDraft)
    .where(
      and(
        eq(checkoutAttachmentDraft.id, attachmentId),
        eq(checkoutAttachmentDraft.userId, buyerId)
      )
    )
    .limit(1);
  if (!attachment) {
    throw new ORPCError("NOT_FOUND", {
      message: "Không tìm thấy ảnh Checkout.",
    });
  }

  await deleteOrderFileObject(attachment.storageKey, storage);
  await database
    .delete(checkoutAttachmentDraft)
    .where(eq(checkoutAttachmentDraft.id, attachment.id));
};

export const cleanupCheckoutAttachmentDrafts = async ({
  database = db,
  deleteObject = deleteOrderFileObject,
  now = new Date(),
}: CheckoutAttachmentCleanupOptions = {}): Promise<number> => {
  const expiry = new Date(now.getTime() - DRAFT_RETENTION_MS);
  const attachments = await database.query.checkoutAttachmentDraft.findMany({
    limit: DRAFT_CLEANUP_LIMIT,
    where: lte(checkoutAttachmentDraft.createdAt, expiry),
  });

  const deletedCounts = await Promise.all(
    attachments.map(async (attachment) => {
      await deleteObject(attachment.storageKey);
      const [deleted] = await database
        .delete(checkoutAttachmentDraft)
        .where(eq(checkoutAttachmentDraft.id, attachment.id))
        .returning({ id: checkoutAttachmentDraft.id });
      if (!deleted) {
        return 0;
      }
      return 1;
    })
  );
  return deletedCounts.reduce<number>((total, count) => total + count, 0);
};
