import { db } from "@avin/db";
import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";

import { protectionRouter } from "./router";

describe("Avin Check public launch status", () => {
  it("exposes the safe default no-money pilot status", async () => {
    const result = await call(protectionRouter.launchStatus, undefined, {
      context: {
        audit: { record: () => Promise.resolve() },
        db,
        session: null,
      },
    });

    expect(result.pilot).toEqual({
      enabled: true,
      realMoneyDisabled: true,
    });
    expect(result.providerBondRecognition.enabled).toBe(false);
    expect(result.providerBondRecognition.blockers).toContain("NO_MONEY_PILOT");
  });
});
