import { describe, expect, it, vi } from "vitest";

import {
  EMAIL_DELIVERY_MAX_ATTEMPTS,
  EMAIL_DELIVERY_RETRY_WINDOW_MS,
  claimEmailDeliveries,
  getEmailRetryDecision,
} from "./email-delivery";
import type { EmailDeliveryRow } from "./email-delivery";

describe("email delivery retry policy", () => {
  const now = new Date("2026-08-11T03:00:00.000Z");

  it("backs off within the bounded retry window", () => {
    const decision = getEmailRetryDecision({
      attemptCount: 2,
      firstAttemptAt: new Date(now.getTime() - 60_000),
      now,
    });

    expect(decision.status).toBe("retrying");
    expect(decision.nextAttemptAt?.getTime()).toBe(now.getTime() + 300_000);
  });

  it("stops after five attempts or twenty-four hours", () => {
    expect(
      getEmailRetryDecision({
        attemptCount: EMAIL_DELIVERY_MAX_ATTEMPTS,
        firstAttemptAt: now,
        now,
      })
    ).toEqual({ nextAttemptAt: null, status: "failed" });

    expect(
      getEmailRetryDecision({
        attemptCount: 1,
        firstAttemptAt: new Date(
          now.getTime() - EMAIL_DELIVERY_RETRY_WINDOW_MS
        ),
        now,
      })
    ).toEqual({ nextAttemptAt: null, status: "failed" });
  });

  it("claims with a database row lock and skip-locked lease", async () => {
    const candidate = { id: "delivery-1" } as EmailDeliveryRow;
    const lockRows = vi.fn().mockResolvedValue([candidate]);
    const returning = vi.fn().mockResolvedValue([candidate]);
    const transaction = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ for: lockRows }),
            }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ returning }),
        }),
      }),
    };
    const database = {
      transaction: vi
        .fn()
        // oxlint-disable-next-line promise/prefer-await-to-callbacks, node/callback-return
        .mockImplementation(async (callback) => await callback(transaction)),
    } as never;

    await expect(
      claimEmailDeliveries({
        database,
        now,
      })
    ).resolves.toEqual([candidate]);
    expect(lockRows).toHaveBeenCalledWith("update", { skipLocked: true });
    expect(returning).toHaveBeenCalledOnce();
  });
});
