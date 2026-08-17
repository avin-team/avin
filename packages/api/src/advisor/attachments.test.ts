import { describe, expect, it, vi } from "vitest";

import type { Context } from "../runtime/context";
import type { ManagedObjectStore } from "../runtime/storage";
import {
  cleanupExpiredAdvisorAttachments,
  deleteAdvisorAttachmentObjects,
} from "./attachments";

const ATTACHMENT = {
  storageKey: "sessions/session-1/attachments/attachment-1.png",
};

const createStorage = (
  deleteObject: ManagedObjectStore["deleteObject"]
): ManagedObjectStore => ({
  deleteObject,
  supabaseUrl: "https://storage.example",
});

describe("Advisor attachment reconciliation", () => {
  it("treats an already-missing object as reconciled", async () => {
    const deleteObject = vi.fn(() =>
      Promise.reject(new Error("NoSuchKey: object not found (404)"))
    );

    await expect(
      deleteAdvisorAttachmentObjects({
        attachments: [ATTACHMENT],
        storage: createStorage(deleteObject),
      })
    ).resolves.toBeUndefined();
    expect(deleteObject).toHaveBeenCalledWith(
      ATTACHMENT.storageKey,
      "advisor-attachments"
    );
  });

  it("keeps database state when storage is unavailable", async () => {
    const database = {
      delete: vi.fn(),
      query: {
        advisorAttachment: {
          findMany: vi.fn().mockResolvedValue([ATTACHMENT]),
        },
      },
    } as unknown as Context["db"];

    await expect(
      cleanupExpiredAdvisorAttachments({
        database,
        now: new Date("2026-08-18T00:00:00.000Z"),
        storage: undefined,
      })
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(database.delete).not.toHaveBeenCalled();
  });

  it("attempts every object and preserves rows after a partial failure", async () => {
    const attachments = [
      {
        id: "attachment-1",
        storageKey: "sessions/session-1/attachments/attachment-1.png",
      },
      {
        id: "attachment-2",
        storageKey: "sessions/session-1/attachments/attachment-2.png",
      },
    ];
    const database = {
      delete: vi.fn(),
      query: {
        advisorAttachment: {
          findMany: vi.fn().mockResolvedValue(attachments),
        },
      },
    } as unknown as Context["db"];
    const deleteObject = vi.fn((storageKey: string): Promise<void> => {
      if (storageKey.endsWith("attachment-1.png")) {
        return Promise.reject(new Error("Storage timeout"));
      }
      return Promise.resolve();
    });

    await expect(
      cleanupExpiredAdvisorAttachments({
        database,
        now: new Date("2026-08-18T00:00:00.000Z"),
        storage: createStorage(deleteObject),
      })
    ).rejects.toThrow("Storage timeout");
    expect(deleteObject).toHaveBeenCalledTimes(2);
    expect(database.delete).not.toHaveBeenCalled();
  });
});
