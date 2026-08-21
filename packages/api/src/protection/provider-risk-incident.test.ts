import { describe, expect, it } from "vitest";

import {
  assertProviderRiskIncidentTransition,
  getProviderRiskResponseDeadline,
  isProviderRiskResponseOpen,
  PROVIDER_RISK_RESPONSE_WINDOW_MS,
} from "./provider-risk-incident";

describe("Provider risk incident contract", () => {
  it("opens an exact 48-hour response window", () => {
    const noticeVerifiedAt = new Date("2026-08-21T00:00:00.000Z");
    const deadline = getProviderRiskResponseDeadline(noticeVerifiedAt);

    expect(deadline.getTime() - noticeVerifiedAt.getTime()).toBe(
      PROVIDER_RISK_RESPONSE_WINDOW_MS
    );
    expect(
      isProviderRiskResponseOpen({
        incident: {
          responseDeadlineAt: deadline,
          status: "AWAITING_PROVIDER_RESPONSE",
        },
        now: new Date(deadline.getTime() - 1),
      })
    ).toBe(true);
    expect(
      isProviderRiskResponseOpen({
        incident: {
          responseDeadlineAt: deadline,
          status: "AWAITING_PROVIDER_RESPONSE",
        },
        now: deadline,
      })
    ).toBe(false);
  });

  it("allows response, review, and enforcement transitions but keeps terminal states immutable", () => {
    expect(() =>
      assertProviderRiskIncidentTransition(
        "AWAITING_PROVIDER_RESPONSE",
        "PROVIDER_RESPONDED"
      )
    ).not.toThrow();
    expect(() =>
      assertProviderRiskIncidentTransition(
        "RESPONSE_EXPIRED",
        "CONFIRMED_FRAUD"
      )
    ).not.toThrow();
    expect(() =>
      assertProviderRiskIncidentTransition("DISMISSED", "UNDER_REVIEW")
    ).toThrow("is not allowed");
    expect(() =>
      assertProviderRiskIncidentTransition("CONFIRMED_FRAUD", "DISMISSED")
    ).toThrow("is not allowed");
  });
});
