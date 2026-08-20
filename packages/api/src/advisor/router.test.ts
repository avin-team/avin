import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { AuditEvent, Context } from "../runtime/context";
import type {
  AdvisorProviderManager,
  AdvisorProviderStatus,
  AdvisorProviderTestResult,
} from "./provider";
import { advisorRouter } from "./router";

const status: AdvisorProviderStatus = {
  configured: true,
  contractVerifiedAt: "2026-08-17T00:00:00.000Z",
  disabledAt: null,
  isPreview: true,
  isVisionCapable: true,
  keyLastFour: "1234",
  lastCheckedAt: "2026-08-17T00:00:00.000Z",
  lastErrorCode: null,
  lastErrorMessage: null,
  model: "qwen/qwen3.6-27b",
  provider: "groq",
  state: "ACTIVE",
  zdrVerifiedAt: "2026-08-17T00:00:00.000Z",
};

const createContext = (
  role: (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE],
  twoFactorEnabled: boolean,
  advisorProvider: AdvisorProviderManager,
  auditEvents: AuditEvent[] = []
): Context => ({
  advisorProvider,
  audit: {
    record: (event) => {
      auditEvents.push(event);
      return Promise.resolve();
    },
  },
  db: undefined as never,
  session: {
    session: {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
      id: "session-1",
      ipAddress: null,
      token: "session-token",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      userAgent: null,
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
      name: "Admin",
      role,
      twoFactorEnabled,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  },
});

const manager = (): AdvisorProviderManager => ({
  activateConfiguration: vi.fn(() => Promise.resolve(status)),
  disableConfiguration: vi.fn(() =>
    Promise.resolve<AdvisorProviderStatus>({ ...status, state: "DISABLED" })
  ),
  getStatus: vi.fn(() => Promise.resolve(status)),
  markUnavailable: vi.fn(() =>
    Promise.resolve<AdvisorProviderStatus>({
      ...status,
      lastErrorCode: "PROVIDER_UNAVAILABLE",
      state: "UNAVAILABLE",
    })
  ),
  testConfiguration: vi.fn(
    (): Promise<AdvisorProviderTestResult> =>
      Promise.resolve({
        contractVerified: true,
        message: "Groq contract verified.",
        model: "qwen/qwen3.6-27b",
        provider: "groq",
      })
  ),
});

describe("Advisor provider router authorization", () => {
  it("rejects Buyer callers before reading provider status", async () => {
    const provider = manager();

    await expect(
      call(advisorRouter.provider.get, undefined, {
        context: createContext(ACCOUNT_ROLE.BUYER, true, provider),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(provider.getStatus).not.toHaveBeenCalled();
  });

  it("rejects Admin callers without 2FA before mutating configuration", async () => {
    const provider = manager();

    await expect(
      call(
        advisorRouter.provider.activate,
        { apiKey: "groq-secret", model: "qwen/qwen3.6-27b" },
        { context: createContext(ACCOUNT_ROLE.ADMIN, false, provider) }
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(provider.activateConfiguration).not.toHaveBeenCalled();
  });

  it("audits provider failures without recording the key", async () => {
    const auditEvents: AuditEvent[] = [];
    const provider = manager();
    const providerError = Object.assign(
      new Error("Groq rejected groq-secret"),
      { code: "PROVIDER_CONTRACT_FAILED" }
    );
    const failingProvider: AdvisorProviderManager = {
      ...provider,
      testConfiguration: vi.fn(() => Promise.reject(providerError)),
    };

    await expect(
      call(
        advisorRouter.provider.test,
        { apiKey: "groq-secret", model: "qwen/qwen3.6-27b" },
        {
          context: createContext(
            ACCOUNT_ROLE.ADMIN,
            true,
            failingProvider,
            auditEvents
          ),
        }
      )
    ).rejects.toThrow("Groq provider contract verification failed.");

    expect(auditEvents).toEqual([
      {
        action: "advisor.provider.test",
        actorUserId: "admin-1",
        metadata: { model: "qwen/qwen3.6-27b" },
        outcome: "FAILURE",
        targetId: "groq",
        targetType: "ADVISOR_PROVIDER",
      },
    ]);
    expect(JSON.stringify(auditEvents)).not.toContain("groq-secret");
  });

  it("surfaces a rejected Groq API key without exposing it", async () => {
    const provider = manager();
    const providerError = Object.assign(new Error("Invalid API Key"), {
      code: "PROVIDER_AUTH_FAILED",
    });
    const failingProvider: AdvisorProviderManager = {
      ...provider,
      testConfiguration: vi.fn(() => Promise.reject(providerError)),
    };

    await expect(
      call(
        advisorRouter.provider.test,
        { apiKey: "groq-secret", model: "qwen/qwen3.6-27b" },
        {
          context: createContext(ACCOUNT_ROLE.ADMIN, true, failingProvider),
        }
      )
    ).rejects.toThrow(
      "Groq API key was rejected. Check that the key is active and can access the selected model."
    );
  });

  it("surfaces Groq preview capacity failures separately from auth failures", async () => {
    const provider = manager();
    const providerError = Object.assign(new Error("Service Unavailable"), {
      code: "PROVIDER_UPSTREAM_UNAVAILABLE",
    });
    const failingProvider: AdvisorProviderManager = {
      ...provider,
      testConfiguration: vi.fn(() => Promise.reject(providerError)),
    };

    await expect(
      call(
        advisorRouter.provider.test,
        { apiKey: "groq-secret", model: "qwen/qwen3.6-27b" },
        {
          context: createContext(ACCOUNT_ROLE.ADMIN, true, failingProvider),
        }
      )
    ).rejects.toThrow(
      "Groq could not serve the preview model right now. Retry shortly or check Groq status."
    );
  });

  it("includes the configured model in disable audits", async () => {
    const auditEvents: AuditEvent[] = [];
    const provider = manager();

    await call(
      advisorRouter.provider.disable,
      {},
      {
        context: createContext(ACCOUNT_ROLE.ADMIN, true, provider, auditEvents),
      }
    );

    expect(auditEvents).toEqual([
      {
        action: "advisor.provider.disable",
        actorUserId: "admin-1",
        metadata: { model: "qwen/qwen3.6-27b" },
        outcome: "SUCCESS",
        targetId: "groq",
        targetType: "ADVISOR_PROVIDER",
      },
    ]);
  });

  it("rejects model IDs outside the tested allowlist", async () => {
    const provider = manager();

    await expect(
      call(
        advisorRouter.provider.test,
        { apiKey: "groq-secret", model: "llama-unsupported" } as never,
        { context: createContext(ACCOUNT_ROLE.ADMIN, true, provider) }
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(provider.testConfiguration).not.toHaveBeenCalled();
  });

  it("rejects arbitrary provider endpoint fields", async () => {
    const provider = manager();

    await expect(
      call(
        advisorRouter.provider.test,
        {
          apiKey: "groq-secret",
          baseURL: "https://attacker.example",
          model: "qwen/qwen3.6-27b",
        } as never,
        { context: createContext(ACCOUNT_ROLE.ADMIN, true, provider) }
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(provider.testConfiguration).not.toHaveBeenCalled();
  });
});
