import { describe, expect, it } from "vitest";

import type { Context } from "../runtime/context";
import { assertProtectionPilotApprovalAllowed } from "./pilot";

const createDatabase = ({
  configuration,
  invitation,
  profileCount,
}: {
  configuration: { approvalCap: number; enabled: boolean; id: string };
  invitation: object | null;
  profileCount: number;
}): Context["db"] => {
  const selectedRows: unknown[][] = [
    [
      {
        ...configuration,
        updatedAt: new Date("2026-08-21T00:00:00.000Z"),
        updatedByUserId: "manager-1",
      },
    ],
    invitation ? [invitation] : [],
    Array.from({ length: profileCount }, (_, index) => ({
      id: `profile-${index}`,
    })),
  ];
  let selectIndex = 0;

  const database = {
    select: () => {
      const selected = selectedRows[selectIndex] ?? [];
      selectIndex += 1;
      const query = {
        execute: () => Promise.resolve(selected),
        for: () => query,
        from: () => query,
        limit: () => Promise.resolve(selected),
        where: () => query,
      };
      return query;
    },
  };
  return database as unknown as Context["db"];
};

const configuration = {
  approvalCap: 10,
  enabled: true,
  id: "DEFAULT",
};

describe("Invitation-limited Protection pilot", () => {
  it("requires an invitation while keeping the application path open", async () => {
    await expect(
      assertProtectionPilotApprovalAllowed(
        createDatabase({
          configuration,
          invitation: null,
          profileCount: 0,
        }),
        "provider-1"
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an invited Provider below the cap", async () => {
    const invitation = { id: "invitation-1", providerUserId: "provider-1" };

    await expect(
      assertProtectionPilotApprovalAllowed(
        createDatabase({
          configuration,
          invitation,
          profileCount: 9,
        }),
        "provider-1"
      )
    ).resolves.toEqual(invitation);
  });

  it("blocks the next approval after the configured 10–20 Provider cap", async () => {
    await expect(
      assertProtectionPilotApprovalAllowed(
        createDatabase({
          configuration,
          invitation: { id: "invitation-1", providerUserId: "provider-1" },
          profileCount: 10,
        }),
        "provider-1"
      )
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
