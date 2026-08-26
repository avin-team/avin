import { describe, expect, it } from "vitest";

import {
  getRiskLookupHandoff,
  rememberRiskLookupHandoff,
  takeRememberedRiskLookupHandoff,
} from "./risk-lookup-handoff";

describe("risk lookup handoff", () => {
  it("accepts only the in-memory report prefill shape", () => {
    expect(
      getRiskLookupHandoff({
        riskLookup: { kind: "FACEBOOK", value: "facebook.com/acme" },
      })
    ).toEqual({ kind: "FACEBOOK", value: "facebook.com/acme" });
    expect(
      getRiskLookupHandoff({ riskLookup: { kind: "UNKNOWN", value: "secret" } })
    ).toBeNull();
    expect(
      getRiskLookupHandoff({ riskLookup: { kind: "PHONE", value: "123" } })
    ).toBeNull();
  });

  it("consumes the short-lived handoff when authentication interrupts navigation", () => {
    sessionStorage.clear();
    rememberRiskLookupHandoff({ kind: "WEBSITE", value: "example.com" });

    expect(takeRememberedRiskLookupHandoff()).toEqual({
      kind: "WEBSITE",
      value: "example.com",
    });
    expect(takeRememberedRiskLookupHandoff()).toBeNull();
  });
});
