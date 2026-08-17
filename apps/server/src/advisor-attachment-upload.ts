import {
  advisorVisitorCapabilitySchema,
  hashVisitorCapability,
} from "@avin/api/advisor/advisor";
import {
  createAdvisorAttachmentRecord,
  cleanupExpiredAdvisorAttachments,
  deleteAdvisorAttachment,
  getOwnedAdvisorSession,
  readAdvisorAttachmentBytes,
} from "@avin/api/advisor/attachments";
import { ADVISOR_ATTACHMENT_MAX_PER_SESSION } from "@avin/api/storage";
import type { ManagedObjectStore } from "@avin/api/storage";
import { auth } from "@avin/auth";
import type { db } from "@avin/db";
import { advisorAttachment } from "@avin/db/schema/advisor";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";

import {
  AdvisorAttachmentRejectionError,
  normalizeAdvisorImage,
} from "./advisor-attachments";

export interface AdvisorAttachmentUploadDependencies {
  database: typeof db;
  getSession?: typeof auth.api.getSession;
  storage?: ManagedObjectStore;
}

const attachmentIdSchema = z.uuid();

const getRequestOwner = async (
  request: Request,
  visitorCapability: string | undefined,
  getSession: NonNullable<AdvisorAttachmentUploadDependencies["getSession"]>
) => {
  const session = await getSession({ headers: request.headers });
  const parsedCapability = visitorCapability
    ? advisorVisitorCapabilitySchema.safeParse(visitorCapability)
    : null;
  return {
    owner: {
      userId: session?.user.id ?? null,
      visitorCapabilityHash: parsedCapability?.success
        ? hashVisitorCapability(parsedCapability.data)
        : null,
    },
    session,
  };
};

const getErrorStatus = (
  error: unknown
): 400 | 403 | 404 | 409 | 413 | 500 | 503 => {
  if (error instanceof z.ZodError) {
    return 400;
  }
  if (error instanceof AdvisorAttachmentRejectionError) {
    return error.code === "ATTACHMENT_TOO_LARGE" ||
      error.code === "ATTACHMENT_NORMALIZED_TOO_LARGE"
      ? 413
      : 400;
  }
  if (error instanceof ORPCError) {
    if (error.code === "FORBIDDEN") {
      return 403;
    }
    if (error.code === "NOT_FOUND") {
      return 404;
    }
    if (error.code === "CONFLICT") {
      return 409;
    }
    if (error.code === "SERVICE_UNAVAILABLE") {
      return 503;
    }
    if (error.code === "BAD_REQUEST" || error.code === "PRECONDITION_FAILED") {
      return 400;
    }
  }
  return 500;
};

const errorResponse = (context: Context, error: unknown): Response => {
  const status = getErrorStatus(error);
  const message =
    error instanceof AdvisorAttachmentRejectionError ||
    error instanceof ORPCError
      ? error.message
      : "Advisor image request failed.";
  let code = "ADVISOR_ATTACHMENT_ERROR";
  if (
    error instanceof AdvisorAttachmentRejectionError ||
    error instanceof ORPCError
  ) {
    const { code: errorCode } = error;
    code = errorCode;
  }
  return context.json(
    {
      code,
      message,
    },
    status
  );
};

export const createAdvisorAttachmentUploadApp = ({
  database,
  getSession = auth.api.getSession,
  storage,
}: AdvisorAttachmentUploadDependencies): Hono => {
  const app = new Hono();

  app.post("/api/advisor/attachments", async (context) => {
    try {
      if (!storage?.putObject || !storage.getObject) {
        throw new ORPCError("SERVICE_UNAVAILABLE", {
          message: "Advisor image storage is temporarily unavailable.",
        });
      }
      const form = await context.req.raw.formData();
      const sessionId = z.uuid().parse(form.get("sessionId"));
      const visitorCapabilityValue = form.get("visitorCapability");
      const visitorCapability =
        typeof visitorCapabilityValue === "string"
          ? visitorCapabilityValue
          : undefined;
      const fileValue = form.get("file");
      if (!(fileValue instanceof File)) {
        throw new AdvisorAttachmentRejectionError(
          "Chọn một tệp ảnh trước khi gửi.",
          "ATTACHMENT_MISSING_FILE"
        );
      }

      const { owner } = await getRequestOwner(
        context.req.raw,
        visitorCapability,
        getSession
      );
      const session = await getOwnedAdvisorSession({
        database,
        owner,
        sessionId,
      });
      await cleanupExpiredAdvisorAttachments({
        database,
        now: new Date(),
        storage,
      });
      const existing = await database.query.advisorAttachment.findMany({
        columns: { id: true },
        where: eq(advisorAttachment.sessionId, session.id),
      });
      if (existing.length >= ADVISOR_ATTACHMENT_MAX_PER_SESSION) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Mỗi session tối đa ${ADVISOR_ATTACHMENT_MAX_PER_SESSION} ảnh.`,
        });
      }

      const normalized = await normalizeAdvisorImage({
        bytes: new Uint8Array(await fileValue.arrayBuffer()),
        contentType: fileValue.type,
        fileName: fileValue.name,
      });
      const attachment = await createAdvisorAttachmentRecord({
        bytes: normalized.bytes,
        contentType: normalized.contentType,
        database,
        fileName: fileValue.name,
        height: normalized.height,
        sessionId: session.id,
        storage,
        width: normalized.width,
      });
      return context.json(
        {
          attachment: {
            byteSize: attachment.byteSize,
            contentType: attachment.contentType,
            expiresAt: attachment.expiresAt.toISOString(),
            fileName: attachment.fileName,
            height: attachment.height,
            id: attachment.id,
            width: attachment.width,
          },
        },
        201
      );
    } catch (error) {
      return errorResponse(context, error);
    }
  });

  app.delete("/api/advisor/attachments/:attachmentId", async (context) => {
    try {
      const attachmentId = attachmentIdSchema.parse(
        context.req.param("attachmentId")
      );
      const visitorCapability = context.req.header(
        "x-advisor-visitor-capability"
      );
      const { owner, session } = await getRequestOwner(
        context.req.raw,
        visitorCapability,
        getSession
      );
      if (!session && !owner.visitorCapabilityHash) {
        throw new ORPCError("FORBIDDEN", {
          message: "Advisor session ownership is required.",
        });
      }
      const attachment = await database.query.advisorAttachment.findFirst({
        where: eq(advisorAttachment.id, attachmentId),
      });
      if (!attachment) {
        throw new ORPCError("NOT_FOUND", {
          message: "Advisor attachment not found.",
        });
      }
      await getOwnedAdvisorSession({
        database,
        owner,
        sessionId: attachment.sessionId,
      });
      await deleteAdvisorAttachment({
        attachmentId,
        database,
        storage,
      });
      return context.json({ deleted: true, id: attachmentId });
    } catch (error) {
      return errorResponse(context, error);
    }
  });

  app.get("/api/advisor/attachments/:attachmentId", async (context) => {
    try {
      const attachmentId = attachmentIdSchema.parse(
        context.req.param("attachmentId")
      );
      const visitorCapability = context.req.header(
        "x-advisor-visitor-capability"
      );
      const { owner, session } = await getRequestOwner(
        context.req.raw,
        visitorCapability,
        getSession
      );
      if (!session && !owner.visitorCapabilityHash) {
        throw new ORPCError("FORBIDDEN", {
          message: "Advisor session ownership is required.",
        });
      }
      const attachment = await database.query.advisorAttachment.findFirst({
        where: eq(advisorAttachment.id, attachmentId),
      });
      if (!attachment) {
        throw new ORPCError("NOT_FOUND", {
          message: "Advisor attachment not found.",
        });
      }
      await getOwnedAdvisorSession({
        database,
        owner,
        sessionId: attachment.sessionId,
      });
      const bytes = await readAdvisorAttachmentBytes({ attachment, storage });
      return new Response(bytes, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Length": String(bytes.byteLength),
          "Content-Type": attachment.contentType,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      return errorResponse(context, error);
    }
  });

  return app;
};
