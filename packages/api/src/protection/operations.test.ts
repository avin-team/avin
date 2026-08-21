import { describe, expect, it } from "vitest";

import type { Context } from "../runtime/context";
import {
  getProtectionSlaStatus,
  listProtectionOperationsQueue,
} from "./operations";

const createDatabase = (rows: unknown[][]): Context["db"] => {
  let rowIndex = 0;
  const database = {
    select: () => ({
      from: () => ({
        where: () => ({
          execute: () => {
            const currentRows = rows[rowIndex] ?? [];
            rowIndex += 1;
            return Promise.resolve(currentRows);
          },
        }),
      }),
    }),
  };
  return database as unknown as Context["db"];
};

describe("Protection operations SLA queue", () => {
  it("classifies overdue, due-soon, and on-track deadlines", () => {
    const now = new Date("2026-08-21T00:00:00.000Z");

    expect(
      getProtectionSlaStatus(new Date("2026-08-20T23:59:00.000Z"), now)
    ).toBe("OVERDUE");
    expect(
      getProtectionSlaStatus(new Date("2026-08-21T12:00:00.000Z"), now)
    ).toBe("DUE_SOON");
    expect(
      getProtectionSlaStatus(new Date("2026-08-23T00:00:00.000Z"), now)
    ).toBe("ON_TRACK");
  });

  it("builds a queue item and summary for a pending Provider application", async () => {
    const now = new Date("2026-08-21T00:00:00.000Z");
    const dashboard = await listProtectionOperationsQueue({
      database: createDatabase([
        [
          {
            createdAt: new Date("2026-08-17T00:00:00.000Z"),
            fullName: "Provider One",
            id: "application-1",
            providerUserId: "provider-1",
            status: "PENDING_REVIEW",
            submittedAt: new Date("2026-08-17T00:00:00.000Z"),
          },
        ],
        [],
        [],
        [],
      ]),
      now,
    });

    expect(dashboard.summary).toEqual({
      dueSoon: 0,
      onTrack: 0,
      overdue: 1,
      total: 1,
    });
    expect(dashboard.items[0]).toMatchObject({
      ageHours: 96,
      id: "application-1",
      isOverdue: true,
      queue: "PROVIDER_APPLICATIONS",
      slaStatus: "OVERDUE",
      title: "Provider One",
    });
  });
});
