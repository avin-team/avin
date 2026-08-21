import {
  ACCOUNT_ROLE,
  protectionAdminCapabilities,
} from "@avin/auth/permissions";
import { db } from "@avin/db";
import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { AuditEvent, Context } from "../runtime/context";
import {
  assertProtectionAdminAccess,
  protectionAdminProcedure,
} from "./procedures";

const createContext = (
  role: string,
  options: {
    auditEvents?: AuditEvent[];
    capabilities?: readonly (typeof protectionAdminCapabilities)[number][];
    ipAddress?: string | null;
    twoFactorEnabled?: boolean;
    userId?: string;
  } = {}
): Context => {
  const userId = options.userId ?? "admin-1";
  const auditEvents = options.auditEvents ?? [];

  return {
    audit: {
      record: (event) => {
        auditEvents.push(event);
        return Promise.resolve();
      },
    },
    db,
    protectionCapabilities: options.capabilities ?? [],
    session: {
      session: {
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        expiresAt: new Date("2026-01-08T00:00:00.000Z"),
        id: "session-1",
        ipAddress: options.ipAddress ?? "203.0.113.10",
        token: "session-token",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        userAgent: "test-agent",
        userId,
      },
      user: {
        banExpires: null,
        banReason: null,
        banned: false,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        email: "admin@example.com",
        emailVerified: true,
        hasSeenSellerOnboarding: false,
        id: userId,
        image: null,
        name: "Protection Admin",
        role: role as (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE],
        twoFactorEnabled: options.twoFactorEnabled ?? true,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    },
  };
};

const createProcedure = (
  capability: (typeof protectionAdminCapabilities)[number]
) =>
  protectionAdminProcedure({
    action: "protection.test.read",
    capability,
    purpose: "Verify the protection Admin capability contract",
    target: { id: "target-1", type: "PROTECTION_TEST" },
  }).handler(() => "allowed");

describe("Protection Admin capability matrix", () => {
  it.each(protectionAdminCapabilities)(
    "allows an Admin with %s",
    async (capability) => {
      await expect(
        call(createProcedure(capability), undefined, {
          context: createContext(ACCOUNT_ROLE.ADMIN, {
            capabilities: [capability],
          }),
        })
      ).resolves.toBe("allowed");
    }
  );

  it("allows SUPER_ADMIN to operate a delegated control", async () => {
    await expect(
      call(createProcedure("RISK_MODERATOR"), undefined, {
        context: createContext(ACCOUNT_ROLE.ADMIN, {
          capabilities: ["SUPER_ADMIN"],
        }),
      })
    ).resolves.toBe("allowed");
  });

  it("allows any capability from a delegated capability set", () => {
    expect(() =>
      assertProtectionAdminAccess(
        { id: "admin-1", role: ACCOUNT_ROLE.ADMIN, twoFactorEnabled: true },
        ["BOND_OPERATOR"],
        ["RISK_MODERATOR", "BOND_OPERATOR"]
      )
    ).not.toThrow();
  });

  it("does not treat a coarse Admin role as a protection capability", async () => {
    await expect(
      call(createProcedure("PROVIDER_REVIEWER"), undefined, {
        context: createContext(ACCOUNT_ROLE.ADMIN),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.each([ACCOUNT_ROLE.BUYER, ACCOUNT_ROLE.SELLER])(
    "rejects a marketplace %s from every protection control",
    async (role) => {
      await expect(
        call(createProcedure("PROVIDER_REVIEWER"), undefined, {
          context: createContext(role, {
            capabilities: ["PROVIDER_REVIEWER"],
          }),
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  );

  it("rejects a Provider actor even when the actor has a marketplace-looking role", () => {
    expect(() =>
      assertProtectionAdminAccess(
        { id: "provider-1", role: "PROVIDER", twoFactorEnabled: true },
        ["PROVIDER_REVIEWER"],
        "PROVIDER_REVIEWER"
      )
    ).toThrowError(/Forbidden/u);
  });

  it("requires completed Admin two-factor authentication", async () => {
    await expect(
      call(createProcedure("PROVIDER_REVIEWER"), undefined, {
        context: createContext(ACCOUNT_ROLE.ADMIN, {
          capabilities: ["PROVIDER_REVIEWER"],
          twoFactorEnabled: false,
        }),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("Protection Admin audit contract", () => {
  it("records purpose, target, session, IP, time, actor, and outcome on success", async () => {
    const auditEvents: AuditEvent[] = [];

    await call(createProcedure("PROVIDER_REVIEWER"), undefined, {
      context: createContext(ACCOUNT_ROLE.ADMIN, {
        auditEvents,
        capabilities: ["PROVIDER_REVIEWER"],
      }),
    });

    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]).toMatchObject({
      action: "protection.test.read",
      actorUserId: "admin-1",
      ipAddress: "203.0.113.10",
      outcome: "SUCCESS",
      purpose: "Verify the protection Admin capability contract",
      sessionId: "session-1",
      targetId: "target-1",
      targetType: "PROTECTION_TEST",
    });
    expect(auditEvents[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("records a failure when capability authorization is denied", async () => {
    const auditEvents: AuditEvent[] = [];

    await expect(
      call(createProcedure("RISK_MODERATOR"), undefined, {
        context: createContext(ACCOUNT_ROLE.ADMIN, { auditEvents }),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]).toMatchObject({
      action: "protection.test.read",
      actorUserId: "admin-1",
      outcome: "FAILURE",
      purpose: "Verify the protection Admin capability contract",
      sessionId: "session-1",
    });
    expect(auditEvents[0]?.createdAt).toBeInstanceOf(Date);
  });
});
