import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { db } from "@avin/db";
import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { AuditEvent, Context } from "../runtime/context";
import {
  adminProcedure,
  assertAccountAccess,
  auditedAdminProcedure,
  buyerProcedure,
  providerProcedure,
  protectedProcedure,
} from "./procedures";

const createContext = (
  role: string,
  twoFactorEnabled = true,
  userId = "user-1",
  auditEvents: AuditEvent[] = [],
  banned = false
): Context => ({
  audit: {
    record: (event) => {
      auditEvents.push(event);
      return Promise.resolve();
    },
  },
  db,
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
      banned,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      email: "user@example.com",
      emailVerified: true,
      hasSeenSellerOnboarding: false,
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
          db,
          session: null,
        },
      })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a Provider from marketplace-protected procedures", async () => {
    const procedure = protectedProcedure.handler(() => "marketplace-private");

    await expect(
      call(procedure, undefined, {
        context: createContext("PROVIDER"),
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("Provider procedure authorization", () => {
  it.each([ACCOUNT_ROLE.BUYER, ACCOUNT_ROLE.SELLER])(
    "accepts a %s session",
    async (role) => {
      const procedure = providerProcedure.handler(() => "provider-private");

      await expect(
        call(procedure, undefined, {
          context: createContext(role),
        })
      ).resolves.toBe("provider-private");
    }
  );

  it.each([ACCOUNT_ROLE.ADMIN, "PROVIDER"])(
    "rejects a %s session",
    async (role) => {
      const procedure = providerProcedure.handler(() => "provider-private");

      await expect(
        call(procedure, undefined, {
          context: createContext(role),
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
  );

  it("allows Provider actions without two-factor authentication", async () => {
    const procedure = providerProcedure.handler(() => "provider-private");
    await expect(
      call(procedure, undefined, {
        context: createContext(ACCOUNT_ROLE.BUYER, false),
      })
    ).resolves.toBe("provider-private");
  });

  it("rejects a locked Buyer or Seller from the Provider workspace", async () => {
    const procedure = providerProcedure.handler(() => "provider-private");

    await expect(
      call(procedure, undefined, {
        context: createContext(ACCOUNT_ROLE.BUYER, true, "user-1", [], true),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
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
      message:
        "Tài khoản Người bán không thể thực hiện thao tác mua hàng. Vui lòng sử dụng tài khoản Người mua.",
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
