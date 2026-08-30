import { describe, expect, it } from "vitest";

import {
  pilotConfigurationFormSchema,
  pilotInvitationFormSchema,
} from "./pilot-form-schema";

describe("pilot form schemas", () => {
  it("validates the approval cap range", () => {
    expect(
      pilotConfigurationFormSchema.safeParse({
        approvalCap: "10",
        enabled: true,
      }).success
    ).toBe(true);
    expect(
      pilotConfigurationFormSchema.safeParse({
        approvalCap: "21",
        enabled: true,
      }).success
    ).toBe(false);
  });

  it("validates invitation email", () => {
    expect(
      pilotInvitationFormSchema.safeParse({ email: "provider@example.com" })
        .success
    ).toBe(true);
    expect(
      pilotInvitationFormSchema.safeParse({ email: "invalid" }).success
    ).toBe(false);
  });
});
