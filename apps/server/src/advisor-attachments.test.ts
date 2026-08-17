import { hashVisitorCapability } from "@avin/api/advisor/advisor";
import { createAdvisorRolloutGate } from "@avin/api/advisor/rollout";
import type { Context } from "@avin/api/context";
import type { ManagedObjectStore } from "@avin/api/storage";
import type { db } from "@avin/db";
import { describe, expect, it, vi } from "vitest";

import { createAdvisorAttachmentUploadApp } from "./advisor-attachment-upload";
import {
  AdvisorAttachmentRejectionError,
  normalizeAdvisorImage,
} from "./advisor-attachments";

const CAPABILITY = "a".repeat(48);
const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-08-18T00:00:00.000Z");
const SAMPLE_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  ),
  (character) => character.codePointAt(0) ?? 0
);

const createFixture = (advisorRollout?: Context["advisorRollout"]) => {
  const objects = new Map<string, Uint8Array>();
  let attachment: Record<string, unknown> | null = null;
  const storage: ManagedObjectStore = {
    deleteObject: vi.fn((key: string) => {
      objects.delete(key);
      return Promise.resolve();
    }),
    getObject: vi.fn((key: string) => {
      const value = objects.get(key);
      if (!value) {
        return Promise.reject(new Error("missing object"));
      }
      return Promise.resolve(value);
    }),
    putObject: vi.fn((key: string, body: Uint8Array) => {
      objects.set(key, body);
      return Promise.resolve();
    }),
    supabaseUrl: "https://storage.example",
  };
  const database = {
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(null) })),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => ({
        returning: vi.fn().mockResolvedValue([
          {
            ...values,
            committedAt: null,
            createdAt: NOW,
            messageId: null,
            status: "UPLOADED",
          },
        ]),
      })),
    })),
    query: {
      advisorAttachment: {
        findFirst: vi.fn(() => attachment),
        findMany: vi.fn().mockResolvedValue([]),
      },
      advisorSession: {
        findFirst: vi.fn().mockResolvedValue({
          consentId: "00000000-0000-4000-8000-000000000003",
          createdAt: NOW,
          expiresAt: new Date("2026-08-19T00:00:00.000Z"),
          generationStartedAt: null,
          generationStatus: "IDLE",
          id: SESSION_ID,
          lastIdempotencyKey: null,
          lastTurnResponse: null,
          pendingQuestionId: null,
          pinnedPlaybookId: null,
          pinnedSubCategoryId: null,
          serviceNeed: "",
          status: "ACTIVE",
          turnCount: 0,
          updatedAt: NOW,
          userId: null,
          visitorCapabilityHash: hashVisitorCapability(CAPABILITY),
        }),
      },
    },
  } as unknown as Context["db"];
  const getSession = vi.fn().mockResolvedValue(null);
  const app = createAdvisorAttachmentUploadApp({
    advisorRollout,
    database: database as typeof db,
    getSession: getSession as never,
    storage,
  });

  return {
    app,
    database,
    getAttachment: () => attachment,
    getStoredObject: (key: string) => objects.get(key),
    setAttachment: (value: Record<string, unknown> | null) => {
      attachment = value;
    },
    storage,
  };
};

const uploadRequest = (file: File, capability = CAPABILITY) => {
  const form = new FormData();
  form.set("file", file);
  form.set("sessionId", SESSION_ID);
  form.set("visitorCapability", capability);
  return new Request("http://localhost/api/advisor/attachments", {
    body: form,
    method: "POST",
  });
};

describe("Advisor private image attachments", () => {
  it("normalizes valid images and strips the original metadata surface", async () => {
    const normalized = await normalizeAdvisorImage({
      bytes: SAMPLE_PNG,
      contentType: "image/png",
      fileName: "reference.png",
    });

    expect(normalized.contentType).toBe("image/png");
    expect(normalized.width).toBe(1);
    expect(normalized.height).toBe(1);
    expect(normalized.bytes).not.toEqual(SAMPLE_PNG);
  });

  it("rejects mismatched, malformed, and prohibited uploads", async () => {
    await expect(
      normalizeAdvisorImage({
        bytes: SAMPLE_PNG,
        contentType: "image/jpeg",
        fileName: "reference.png",
      })
    ).rejects.toMatchObject({ code: "ATTACHMENT_MIME_MISMATCH" });

    await expect(
      normalizeAdvisorImage({
        bytes: Uint8Array.from([0xff, 0xd8, 0xff, 0x00]),
        contentType: "image/jpeg",
        fileName: "reference.jpg",
      })
    ).rejects.toBeInstanceOf(AdvisorAttachmentRejectionError);

    await expect(
      normalizeAdvisorImage({
        bytes: SAMPLE_PNG,
        contentType: "image/png",
        fileName: "passport.png",
      })
    ).rejects.toMatchObject({ code: "ATTACHMENT_UNSAFE_CONTENT" });
  });

  it("stores uploads privately and never returns a public storage URL", async () => {
    const fixture = createFixture();
    const response = await fixture.app.request(
      uploadRequest(
        new File([SAMPLE_PNG], "reference.png", { type: "image/png" })
      )
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      attachment: Record<string, unknown>;
    };
    expect(body.attachment).not.toHaveProperty("storageKey");
    expect(fixture.storage.putObject).toHaveBeenCalledWith(
      expect.stringContaining(`sessions/${SESSION_ID}/attachments/`),
      expect.any(Uint8Array),
      "image/png",
      "advisor-attachments"
    );
  });

  it("blocks new uploads when the beta rollout is disabled", async () => {
    const fixture = createFixture(createAdvisorRolloutGate({ enabled: false }));
    const response = await fixture.app.request(
      uploadRequest(
        new File([SAMPLE_PNG], "reference.png", { type: "image/png" })
      )
    );

    expect(response.status).toBe(503);
    expect(fixture.storage.putObject).not.toHaveBeenCalled();
  });

  it("rejects an image whose MIME does not match its bytes before persistence", async () => {
    const fixture = createFixture();
    const response = await fixture.app.request(
      uploadRequest(
        new File([SAMPLE_PNG], "reference.jpg", { type: "image/jpeg" })
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "ATTACHMENT_MIME_MISMATCH",
    });
    expect(fixture.storage.putObject).not.toHaveBeenCalled();
  });

  it("requires the capability that owns the Advisor session", async () => {
    const fixture = createFixture();
    const response = await fixture.app.request(
      uploadRequest(
        new File([SAMPLE_PNG], "reference.png", { type: "image/png" }),
        "b".repeat(48)
      )
    );

    expect(response.status).toBe(403);
    expect(fixture.storage.putObject).not.toHaveBeenCalled();
  });
});
