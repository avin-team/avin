import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  adminProcedure,
  assertAccountAccess,
  auditedAdminProcedure,
  buyerProcedure,
  protectedProcedure,
} from "./authorization";
import type { AuditEvent, Context } from "./context";
import { appRouter } from "./routers";

const createContext = (
  role: (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE],
  twoFactorEnabled = true,
  userId = "user-1",
  auditEvents: AuditEvent[] = []
): Context => ({
  audit: {
    record: (event) => {
      auditEvents.push(event);
      return Promise.resolve();
    },
  },
  session: {
    session: {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
      id: "session-1",
      ipAddress: null,
      token: "session-token",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      userAgent: null,
      userId,
    },
    user: {
      banExpires: null,
      banReason: null,
      banned: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      email: "user@example.com",
      emailVerified: true,
      id: userId,
      image: null,
      name: "Test User",
      role,
      twoFactorEnabled,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  },
});

describe("protected procedure authorization", () => {
  it("rejects an unauthenticated caller", async () => {
    const procedure = protectedProcedure.handler(() => "private");

    await expect(
      call(procedure, undefined, {
        context: {
          audit: {
            record: () => Promise.resolve(),
          },
          session: null,
        },
      })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("admin procedure authorization", () => {
  it("rejects a Buyer from an Admin procedure", async () => {
    const procedure = adminProcedure.handler(() => "admin-only");

    await expect(
      call(procedure, undefined, {
        context: createContext(ACCOUNT_ROLE.BUYER),
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("requires two-factor authentication from an Admin", async () => {
    const procedure = adminProcedure.handler(() => "admin-only");

    await expect(
      call(procedure, undefined, {
        context: createContext(ACCOUNT_ROLE.ADMIN, false),
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("Buyer procedure authorization", () => {
  it("accepts a Buyer and rejects a Seller", async () => {
    const procedure = buyerProcedure.handler(() => "buyer-only");

    await expect(
      call(procedure, undefined, {
        context: createContext(ACCOUNT_ROLE.BUYER),
      })
    ).resolves.toBe("buyer-only");
    await expect(
      call(procedure, undefined, {
        context: createContext(ACCOUNT_ROLE.SELLER),
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("production router authorization", () => {
  it("restricts Buyer private data to Buyer identities", async () => {
    await expect(
      call(appRouter.privateData, undefined, {
        context: createContext(ACCOUNT_ROLE.BUYER),
      })
    ).resolves.toMatchObject({
      message: "This is private",
    });
    await expect(
      call(appRouter.privateData, undefined, {
        context: createContext(ACCOUNT_ROLE.SELLER),
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("account ownership authorization", () => {
  it("rejects cross-account access while allowing the owner", async () => {
    const procedure = protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .handler(({ context, input }) => {
        assertAccountAccess(context.session.user, input.accountId);
        return input.accountId;
      });

    await expect(
      call(
        procedure,
        { accountId: "user-1" },
        { context: createContext(ACCOUNT_ROLE.BUYER) }
      )
    ).resolves.toBe("user-1");
    await expect(
      call(
        procedure,
        { accountId: "user-2" },
        { context: createContext(ACCOUNT_ROLE.BUYER) }
      )
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows a two-factor-authenticated Admin to access another account", async () => {
    const procedure = protectedProcedure
      .input(z.object({ accountId: z.string() }))
      .handler(({ context, input }) => {
        assertAccountAccess(context.session.user, input.accountId);
        return input.accountId;
      });

    await expect(
      call(
        procedure,
        { accountId: "user-2" },
        { context: createContext(ACCOUNT_ROLE.ADMIN, true, "admin-1") }
      )
    ).resolves.toBe("user-2");
  });
});

describe("privileged action auditing", () => {
  it("records a successful Admin action", async () => {
    const auditEvents: AuditEvent[] = [];
    const procedure = auditedAdminProcedure("identity.admin.read").handler(
      () => "admin-only"
    );

    await call(procedure, undefined, {
      context: createContext(ACCOUNT_ROLE.ADMIN, true, "admin-1", auditEvents),
    });

    expect(auditEvents).toEqual([
      {
        action: "identity.admin.read",
        actorUserId: "admin-1",
        outcome: "SUCCESS",
      },
    ]);
  });
});
