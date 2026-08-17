import { describe, expect, it } from "vitest";

import { createAdvisorRolloutGate } from "./rollout";
import type { AdvisorRolloutSubject } from "./rollout";

const VISITOR: AdvisorRolloutSubject = {
  visitorCapabilityHash: "visitor-hash",
};

describe("Advisor beta rollout", () => {
  it("keeps a subject in the same bucket across decisions", () => {
    const gate = createAdvisorRolloutGate({
      percentage: 25,
      salt: "test-salt",
    });

    expect(gate.decide(VISITOR)).toEqual(gate.decide(VISITOR));
  });

  it("honors the global kill switch before the allowlist", () => {
    const gate = createAdvisorRolloutGate({
      allowlist: [VISITOR.visitorCapabilityHash ?? ""],
      enabled: false,
      percentage: 100,
    });

    expect(gate.decide(VISITOR)).toMatchObject({
      enabled: false,
      reason: "DISABLED",
    });
  });

  it("lets an allowlisted subject bypass the percentage", () => {
    const gate = createAdvisorRolloutGate({
      allowlist: [VISITOR.visitorCapabilityHash ?? ""],
      percentage: 0,
    });

    expect(gate.decide(VISITOR)).toMatchObject({
      enabled: true,
      reason: "ALLOWLIST",
    });
    expect(gate.getStatus()).toEqual({
      allowlistSize: 1,
      enabled: true,
      percentage: 0,
    });
  });

  it("fails closed when no stable subject is available", () => {
    const gate = createAdvisorRolloutGate({ percentage: 100 });

    expect(gate.decide({})).toMatchObject({
      bucket: null,
      enabled: false,
      reason: "NO_SUBJECT",
    });
  });
});
