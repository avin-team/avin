import { describe, expect, it } from "vitest";

import {
  assertProtectionOperationAllowed,
  getProtectionLaunchStatus,
} from "./launch-gates";
import type { ProtectionLaunchConfiguration } from "./launch-gates";

const approvedGates = {
  custody: true,
  dataGovernance: true,
  legalReview: true,
  programEntity: true,
} as const;

const createConfiguration = (
  overrides: Partial<ProtectionLaunchConfiguration> = {}
): ProtectionLaunchConfiguration => ({
  gates: approvedGates,
  mode: "NO_MONEY_PILOT",
  ...overrides,
});

describe("Avin Check launch gates", () => {
  it("keeps the no-money pilot available without recognizing Provider Bond", () => {
    const status = getProtectionLaunchStatus(createConfiguration());

    expect(status.pilot.enabled).toBe(true);
    expect(status.providerBondRecognition.enabled).toBe(false);
    expect(status.providerBondRecognition.blockers).toContain("NO_MONEY_PILOT");
  });

  it.each([
    ["legalReview", "LEGAL_REVIEW"],
    ["dataGovernance", "DATA_GOVERNANCE_REVIEW"],
    ["programEntity", "PROGRAM_ENTITY_APPROVAL"],
    ["custody", "CUSTODY_APPROVAL"],
  ] as const)(
    "rejects risk publication when the %s gate is not approved",
    (gate, blocker) => {
      const status = getProtectionLaunchStatus(
        createConfiguration({
          gates: { ...approvedGates, [gate]: false },
        })
      );

      expect(status.riskReportPublication.enabled).toBe(false);
      expect(status.riskReportPublication.blockers).toEqual([blocker]);
      expect(() =>
        assertProtectionOperationAllowed(
          createConfiguration({
            gates: { ...approvedGates, [gate]: false },
          }),
          "RISK_REPORT_PUBLICATION"
        )
      ).toThrow(blocker);
    }
  );

  it("rejects Provider Bond recognition in the pilot even when every gate is approved", () => {
    expect(() =>
      assertProtectionOperationAllowed(
        createConfiguration(),
        "PROVIDER_BOND_RECOGNITION"
      )
    ).toThrow("NO_MONEY_PILOT");
  });

  it("allows both gated operations only in a fully approved live configuration", () => {
    const configuration = createConfiguration({ mode: "LIVE" });
    const status = getProtectionLaunchStatus(configuration);

    expect(status.riskReportPublication.enabled).toBe(true);
    expect(status.providerBondRecognition.enabled).toBe(true);
    expect(() =>
      assertProtectionOperationAllowed(configuration, "RISK_REPORT_PUBLICATION")
    ).not.toThrow();
    expect(() =>
      assertProtectionOperationAllowed(
        configuration,
        "PROVIDER_BOND_RECOGNITION"
      )
    ).not.toThrow();
  });
});
