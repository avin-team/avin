import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  exportProtectionOperations,
  protectionOperationsExportInputSchema,
} from "./export";
import { listProtectionOperationsQueue } from "./operations";

vi.mock("./operations", () => ({
  listProtectionOperationsQueue: vi.fn(),
}));

const mockedListProtectionOperationsQueue = vi.mocked(
  listProtectionOperationsQueue
);

describe("Protection operations controlled export", () => {
  beforeEach(() => {
    mockedListProtectionOperationsQueue.mockResolvedValue({
      generatedAt: "2026-08-21T00:00:00.000Z",
      items: [
        {
          ageHours: 4,
          id: "application-1",
          isOverdue: false,
          queue: "PROVIDER_APPLICATIONS",
          slaDeadlineAt: "2026-08-24T00:00:00.000Z",
          slaStatus: "ON_TRACK",
          startedAt: "2026-08-20T20:00:00.000Z",
          status: "PENDING_REVIEW",
          title: "Private provider name must not be exported",
        },
      ],
      summary: { dueSoon: 0, onTrack: 1, overdue: 0, total: 1 },
    });
  });

  it("exports only approved operational metadata with a purpose watermark", async () => {
    const result = await exportProtectionOperations({
      actorUserId: "admin-1",
      database: {} as never,
      input: {
        dataset: "PROVIDER_APPLICATIONS",
        purpose: "  weekly SLA review\n  ",
      },
      now: new Date("2026-08-21T00:00:00.000Z"),
    });

    expect(result.rowCount).toBe(1);
    expect(result.fields).toEqual([
      "id",
      "status",
      "startedAt",
      "slaDeadlineAt",
      "slaStatus",
      "ageHours",
    ]);
    expect(result.content).toContain("# Avin Check controlled export");
    expect(result.content).toContain("purpose=weekly SLA review");
    expect(result.content).toContain('"application-1","PENDING_REVIEW"');
    expect(result.content).not.toContain("Private provider name");
  });

  it("requires a sufficiently specific purpose", () => {
    expect(() =>
      protectionOperationsExportInputSchema.parse({
        dataset: "RISK_REPORTS",
        purpose: "short",
      })
    ).toThrow();
  });
});
