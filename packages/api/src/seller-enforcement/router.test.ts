import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { Context } from "../runtime/context";
import { sellerEnforcementRouter } from "./router";

const createContext = (
  role: (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE]
): Context => ({
  audit: { record: vi.fn(async () => {}) },
  db: {} as Context["db"],
  session: {
    session: {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
      id: "session-1",
      ipAddress: null,
      token: "session-token",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      userAgent: null,
      userId: role === ACCOUNT_ROLE.ADMIN ? "admin-1" : "seller-1",
    },
    user: {
      banExpires: null,
      banReason: null,
      banned: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      email: "actor@example.com",
      emailVerified: true,
      hasSeenSellerOnboarding: false,
      id: role === ACCOUNT_ROLE.ADMIN ? "admin-1" : "seller-1",
      image: null,
      name: "Actor",
      role,
      twoFactorEnabled: true,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  },
});

describe("Seller Enforcement backend router", () => {
  it("rejects a non-Admin before reaching the enforcement handler", async () => {
    await expect(
      call(
        sellerEnforcementRouter.admin.apply,
        {
          idempotencyKey: "enforce-1",
          reasonCode: "POLICY_VIOLATION",
          sellerId: "seller-1",
          sellerReason: "Policy violation",
          state: "SUSPENDED",
        },
        { context: createContext(ACCOUNT_ROLE.BUYER) }
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires a Seller-visible reason for every enforcement decision", async () => {
    await expect(
      call(
        sellerEnforcementRouter.admin.apply,
        {
          idempotencyKey: "enforce-1",
          reasonCode: "POLICY_VIOLATION",
          sellerId: "seller-1",
          sellerReason: "   ",
          state: "BANNED",
        },
        { context: createContext(ACCOUNT_ROLE.ADMIN) }
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
