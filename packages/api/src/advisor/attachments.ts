import { advisorAttachment, advisorSession } from "@avin/db/schema/advisor";
import { ORPCError } from "@orpc/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";

import type { Context } from "../runtime/context";
import type { ManagedObjectStore } from "../runtime/storage";
import {
  ADVISOR_ATTACHMENT_MAX_MODEL_BYTES,
  ADVISOR_ATTACHMENT_MAX_PER_MESSAGE,
  ADVISOR_ATTACHMENT_UNCOMMITTED_TTL_MS,
  ADVISOR_ATTACHMENTS_BUCKET,
  createAdvisorAttachmentKey,
} from "../runtime/storage";

type AdvisorDatabase = Context["db"];

export interface AdvisorAttachmentOwner {
  userId: string | null;
  visitorCapabilityHash: string | null;
}

export interface AdvisorAttachmentStorage {
  deleteObject: ManagedObjectStore["deleteObject"];
  getObject: NonNullable<ManagedObjectStore["getObject"]>;
  putObject: NonNullable<ManagedObjectStore["putObject"]>;
}

export type AdvisorAttachmentRecord = typeof advisorAttachment.$inferSelect;

const requireAttachmentStorage = (
  storage: ManagedObjectStore | undefined
): AdvisorAttachmentStorage => {
  if (!storage?.getObject || !storage.putObject) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Advisor image storage is temporarily unavailable.",
    });
  }
  return {
    deleteObject: storage.deleteObject,
    getObject: storage.getObject,
    putObject: storage.putObject,
  };
};

const sanitizeFileName = (fileName: string): string => {
  const sanitized = fileName
    .normalize("NFC")
    .replaceAll(/[^\p{L}\p{N}._ -]/gu, "_")
    .trim()
    .slice(0, 160);
  return sanitized || "advisor-image";
};

export const isAdvisorSessionOwnedBy = (
  session: Pick<
    typeof advisorSession.$inferSelect,
    "userId" | "visitorCapabilityHash"
  >,
  owner: AdvisorAttachmentOwner
): boolean =>
  (owner.userId !== null && session.userId === owner.userId) ||
  (owner.visitorCapabilityHash !== null &&
    session.visitorCapabilityHash === owner.visitorCapabilityHash);

export const getOwnedAdvisorSession = async ({
  allowExpired = false,
  database,
  now = new Date(),
  owner,
  sessionId,
}: {
  allowExpired?: boolean;
  database: AdvisorDatabase;
  now?: Date;
  owner: AdvisorAttachmentOwner;
  sessionId: string;
}) => {
  const session = await database.query.advisorSession.findFirst({
    where: eq(advisorSession.id, sessionId),
  });
  if (
    !session ||
    session.status === "DELETED" ||
    (!allowExpired && session.status === "EXPIRED")
  ) {
    throw new ORPCError("NOT_FOUND", {
      message: "Advisor session not found.",
    });
  }
  if (!isAdvisorSessionOwnedBy(session, owner)) {
    throw new ORPCError("FORBIDDEN", {
      message: "You do not have access to this Advisor session.",
    });
  }
  if (!allowExpired && session.expiresAt.getTime() <= now.getTime()) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "This Advisor session has expired. Start a new session.",
    });
  }
  return session;
};

export const getAdvisorAttachmentUploadExpiry = (now = new Date()): Date =>
  new Date(now.getTime() + ADVISOR_ATTACHMENT_UNCOMMITTED_TTL_MS);

export const createAdvisorAttachmentRecord = async ({
  bytes,
  contentType,
  database,
  fileName,
  height,
  sessionId,
  storage,
  width,
  now = new Date(),
}: {
  bytes: Uint8Array;
  contentType: string;
  database: AdvisorDatabase;
  fileName: string;
  height: number;
  sessionId: string;
  storage: ManagedObjectStore | undefined;
  width: number;
  now?: Date;
}): Promise<AdvisorAttachmentRecord> => {
  const objectStorage = requireAttachmentStorage(storage);
  const id = crypto.randomUUID();
  const storageKey = createAdvisorAttachmentKey(sessionId, id, contentType);
  await objectStorage.putObject(
    storageKey,
    bytes,
    contentType,
    ADVISOR_ATTACHMENTS_BUCKET
  );
  try {
    const [created] = await database
      .insert(advisorAttachment)
      .values({
        byteSize: bytes.byteLength,
        contentType,
        expiresAt: getAdvisorAttachmentUploadExpiry(now),
        fileName: sanitizeFileName(fileName),
        height,
        id,
        sessionId,
        storageKey,
        width,
      })
      .returning();
    if (!created) {
      throw new ORPCError("SERVICE_UNAVAILABLE", {
        message: "Advisor image could not be saved.",
      });
    }
    return created;
  } catch (error) {
    await objectStorage.deleteObject(storageKey, ADVISOR_ATTACHMENTS_BUCKET);
    throw error;
  }
};

export const loadOwnedAdvisorAttachments = async ({
  attachmentIds,
  database,
  now = new Date(),
  sessionId,
}: {
  attachmentIds: readonly string[];
  database: AdvisorDatabase;
  now?: Date;
  sessionId: string;
}): Promise<AdvisorAttachmentRecord[]> => {
  if (attachmentIds.length === 0) {
    return [];
  }
  if (attachmentIds.length > ADVISOR_ATTACHMENT_MAX_PER_MESSAGE) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Mỗi tin nhắn tối đa ${ADVISOR_ATTACHMENT_MAX_PER_MESSAGE} ảnh.`,
    });
  }
  const uniqueIds = new Set(attachmentIds);
  if (uniqueIds.size !== attachmentIds.length) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Mỗi ảnh chỉ được đính kèm một lần trong cùng một tin nhắn.",
    });
  }
  const rows = await database.query.advisorAttachment.findMany({
    where: and(
      eq(advisorAttachment.sessionId, sessionId),
      eq(advisorAttachment.status, "UPLOADED"),
      inArray(advisorAttachment.id, [...uniqueIds]),
      gte(advisorAttachment.expiresAt, now)
    ),
  });
  const byId = new Map(
    (rows as AdvisorAttachmentRecord[]).map((attachment) => [
      attachment.id,
      attachment,
    ])
  );
  const ordered = attachmentIds.flatMap((id) => {
    const attachment = byId.get(id);
    return attachment ? [attachment] : [];
  });
  if (ordered.length !== attachmentIds.length) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Một hoặc nhiều ảnh không còn hợp lệ hoặc không thuộc session này.",
    });
  }
  const totalBytes = ordered.reduce(
    (total, attachment) => total + attachment.byteSize,
    0
  );
  if (totalBytes > ADVISOR_ATTACHMENT_MAX_MODEL_BYTES) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Tổng dung lượng ảnh cho một lượt tư vấn vượt quá giới hạn.",
    });
  }
  return ordered;
};

export const commitAdvisorAttachments = async ({
  attachments,
  database,
  expiresAt,
  messageId,
  sessionId,
  now = new Date(),
}: {
  attachments: readonly AdvisorAttachmentRecord[];
  database: AdvisorDatabase;
  expiresAt: Date;
  messageId: string;
  sessionId: string;
  now?: Date;
}): Promise<void> => {
  if (attachments.length === 0) {
    return;
  }
  await database
    .update(advisorAttachment)
    .set({
      committedAt: now,
      expiresAt,
      messageId,
      status: "COMMITTED",
    })
    .where(
      and(
        eq(advisorAttachment.sessionId, sessionId),
        eq(advisorAttachment.status, "UPLOADED"),
        inArray(
          advisorAttachment.id,
          attachments.map((attachment) => attachment.id)
        )
      )
    );
};

export const readAdvisorAttachmentBytes = ({
  attachment,
  storage,
}: {
  attachment: AdvisorAttachmentRecord;
  storage: ManagedObjectStore | undefined;
}): Promise<Uint8Array> => {
  const objectStorage = requireAttachmentStorage(storage);
  return objectStorage.getObject(
    attachment.storageKey,
    ADVISOR_ATTACHMENTS_BUCKET
  );
};

export const deleteAdvisorAttachmentObjects = async ({
  attachments,
  storage,
}: {
  attachments: readonly Pick<AdvisorAttachmentRecord, "storageKey">[];
  storage: ManagedObjectStore | undefined;
}): Promise<void> => {
  if (attachments.length === 0 || !storage) {
    return;
  }
  await Promise.all(
    attachments.map((attachment) =>
      storage.deleteObject(attachment.storageKey, ADVISOR_ATTACHMENTS_BUCKET)
    )
  );
};

export const deleteAdvisorAttachment = async ({
  attachmentId,
  database,
  storage,
}: {
  attachmentId: string;
  database: AdvisorDatabase;
  storage: ManagedObjectStore | undefined;
}): Promise<void> => {
  const attachment = await database.query.advisorAttachment.findFirst({
    where: eq(advisorAttachment.id, attachmentId),
  });
  if (!attachment) {
    return;
  }
  await deleteAdvisorAttachmentObjects({ attachments: [attachment], storage });
  await database
    .delete(advisorAttachment)
    .where(eq(advisorAttachment.id, attachment.id));
};

export const cleanupExpiredAdvisorAttachments = async ({
  database,
  now = new Date(),
  storage,
}: {
  database: AdvisorDatabase;
  now?: Date;
  storage: ManagedObjectStore | undefined;
}): Promise<number> => {
  const expired = await database.query.advisorAttachment.findMany({
    where: lte(advisorAttachment.expiresAt, now),
  });
  if (expired.length === 0) {
    return 0;
  }
  await deleteAdvisorAttachmentObjects({ attachments: expired, storage });
  await database.delete(advisorAttachment).where(
    inArray(
      advisorAttachment.id,
      expired.map((attachment) => attachment.id)
    )
  );
  return expired.length;
};
