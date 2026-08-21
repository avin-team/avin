import {
  ACCOUNT_ROLE,
  PROTECTION_ADMIN_CAPABILITY,
} from "@avin/auth/permissions";
import { db } from "@avin/db";
import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { AuditEvent, Context } from "../runtime/context";
import { protectionRouter } from "./router";

const createAdminContext = (
  capabilities: readonly (typeof PROTECTION_ADMIN_CAPABILITY)[keyof typeof PROTECTION_ADMIN_CAPABILITY][],
  twoFactorEnabled = true,
  auditEvents: AuditEvent[] = []
): Context => ({
  audit: {
    record: (event) => {
      auditEvents.push(event);
      return Promise.resolve();
    },
  },
  db,
  protectionCapabilities: capabilities,
  session: {
    session: {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
      id: "session-1",
      ipAddress: "203.0.113.10",
      token: "session-token",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      userAgent: "test-agent",
      userId: "admin-1",
    },
    user: {
      banExpires: null,
      banReason: null,
      banned: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      email: "admin@example.com",
      emailVerified: true,
      hasSeenSellerOnboarding: false,
      id: "admin-1",
      image: null,
      name: "Protection Admin",
      role: ACCOUNT_ROLE.ADMIN,
      twoFactorEnabled,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  },
});

const emptyProviderDatabase = {
  select: () => ({
    from: () => ({
      where: () => ({
        execute: () => Promise.resolve([]),
        limit: () => Promise.resolve([]),
        orderBy: () => ({
          execute: () => Promise.resolve([]),
          limit: () => Promise.resolve([]),
        }),
      }),
    }),
  }),
} as unknown as Context["db"];

describe("Avin Check public launch status", () => {
  it("exposes the safe default no-money pilot status", async () => {
    const result = await call(protectionRouter.launchStatus, undefined, {
      context: {
        audit: { record: () => Promise.resolve() },
        db: emptyProviderDatabase,
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

  it("exposes only a private Provider workspace projection", async () => {
    const result = await call(protectionRouter.providerWorkspace, undefined, {
      context: {
        audit: { record: () => Promise.resolve() },
        db: emptyProviderDatabase,
        session: {
          session: {
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            expiresAt: new Date("2026-01-08T00:00:00.000Z"),
            id: "provider-session",
            ipAddress: null,
            token: "provider-token",
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            userAgent: null,
            userId: "provider-1",
          },
          user: {
            banExpires: null,
            banReason: null,
            banned: false,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            email: "provider@example.com",
            emailVerified: true,
            hasSeenSellerOnboarding: false,
            id: "provider-1",
            image: null,
            name: "Provider One",
            role: ACCOUNT_ROLE.PROVIDER,
            twoFactorEnabled: true,
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        },
      },
    });

    expect(result).toEqual({
      application: null,
      bond: null,
      bondWithdrawal: null,
      identity: {
        id: "provider-1",
        name: "Provider One",
        role: ACCOUNT_ROLE.PROVIDER,
      },
      policy: null,
      privateProviderRecord: {
        source: "PROVIDER_IDENTITY",
        visibility: "PRIVATE",
      },
      profileRevision: null,
      publicProfile: null,
      riskIncidents: [],
    });

    await expect(
      call(protectionRouter.providerWorkspace, undefined, {
        context: createAdminContext([], true),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("protects the Admin launch status behind the manager capability", async () => {
    const auditEvents: AuditEvent[] = [];

    await expect(
      call(protectionRouter.adminLaunchStatus, undefined, {
        context: createAdminContext([], true, auditEvents),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(auditEvents[0]).toMatchObject({
      action: "protection.launch_status.read",
      outcome: "FAILURE",
      purpose: "Review Avin Check launch gates before protected operations",
      sessionId: "session-1",
    });

    await expect(
      call(protectionRouter.adminLaunchStatus, undefined, {
        context: createAdminContext(
          [PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER],
          true,
          auditEvents
        ),
      })
    ).resolves.toMatchObject({ mode: "NO_MONEY_PILOT" });

    expect(auditEvents[1]).toMatchObject({
      action: "protection.launch_status.read",
      outcome: "SUCCESS",
      targetId: "Avin Check",
      targetType: "PROTECTION_MODULE",
    });
  });

  it("rejects the launch status API before checking capability when 2FA is incomplete", async () => {
    await expect(
      call(protectionRouter.adminLaunchStatus, undefined, {
        context: createAdminContext(
          [PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER],
          false
        ),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("protects and audits the Provider Reviewer queue", async () => {
    const auditEvents: AuditEvent[] = [];

    await expect(
      call(
        protectionRouter.adminProviderApplications.list,
        { status: "PENDING_REVIEW" },
        {
          context: createAdminContext([], true, auditEvents),
        }
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(auditEvents[0]).toMatchObject({
      action: "protection.provider_application.review",
      outcome: "FAILURE",
      purpose: "Review Provider applications and publish approved profiles",
      targetId: "PROTECTION_PROVIDER_APPLICATION_QUEUE",
      targetType: "PROTECTION_PROVIDER_APPLICATION_QUEUE",
    });

    await expect(
      call(
        protectionRouter.adminProviderApplications.list,
        { status: "PENDING_REVIEW" },
        {
          context: createAdminContext(
            [PROTECTION_ADMIN_CAPABILITY.PROVIDER_REVIEWER],
            false,
            auditEvents
          ),
        }
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
