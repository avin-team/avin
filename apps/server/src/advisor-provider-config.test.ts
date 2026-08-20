import { ADVISOR_MODEL_ID } from "@avin/api/advisor/provider";
import type { AdvisorProviderConfigInput } from "@avin/api/advisor/provider";
import { describe, expect, it, vi } from "vitest";

import {
  createAdvisorProviderManager,
  decryptAdvisorApiKey,
  encryptAdvisorApiKey,
} from "./advisor-provider-config";
import type {
  AdvisorProviderRepository,
  AdvisorProviderStoredConfig,
} from "./advisor-provider-config";

const MASTER_KEY = "advisor-config-master-key-with-32-plus-bytes";
const FIXED_NOW = new Date("2026-08-17T00:00:00.000Z");
const CONTRACT_STREAM = [
  `data: ${JSON.stringify({
    choices: [
      {
        delta: { content: "OK" },
        finish_reason: null,
        index: 0,
      },
    ],
    id: "chatcmpl-contract",
    model: ADVISOR_MODEL_ID,
    object: "chat.completion.chunk",
  })}`,
  "data: [DONE]",
].join("\n\n");

const createStoredConfig = (
  overrides: Partial<AdvisorProviderStoredConfig> = {}
): AdvisorProviderStoredConfig => ({
  contractVerifiedAt: FIXED_NOW,
  disabledAt: null,
  encryptedApiKey: encryptAdvisorApiKey("old-secret", MASTER_KEY),
  keyFingerprint: "old-fingerprint",
  keyLastFour: "cret",
  lastCheckedAt: FIXED_NOW,
  lastErrorCode: null,
  lastErrorMessage: null,
  model: ADVISOR_MODEL_ID,
  provider: "groq",
  state: "ACTIVE",
  zdrVerifiedAt: FIXED_NOW,
  ...overrides,
});

const createRepository = (initial: AdvisorProviderStoredConfig | null) => {
  let current = initial;
  const repository: AdvisorProviderRepository = {
    disable: vi.fn((disabledAt) => {
      if (!current) {
        return Promise.resolve(null);
      }
      current = { ...current, disabledAt, state: "DISABLED" };
      return Promise.resolve(current);
    }),
    get: vi.fn(() => Promise.resolve(current)),
    markUnavailable: vi.fn((checkedAt, keyFingerprint) => {
      if (!current || current.keyFingerprint !== keyFingerprint) {
        return Promise.resolve(null);
      }
      current = {
        ...current,
        lastCheckedAt: checkedAt,
        lastErrorCode: "PROVIDER_UNAVAILABLE",
        lastErrorMessage:
          "Groq provider is unavailable. Re-test or rotate the configuration.",
        state: "UNAVAILABLE",
      };
      return Promise.resolve(current);
    }),
    upsert: vi.fn((config) => {
      current = config;
      return Promise.resolve(config);
    }),
  };

  return {
    getCurrent: () => current,
    repository,
  };
};

const validInput: AdvisorProviderConfigInput = {
  apiKey: "groq-new-secret",
  model: ADVISOR_MODEL_ID,
};

describe("advisor provider encryption", () => {
  it("encrypts and decrypts keys without storing plaintext", () => {
    const ciphertext = encryptAdvisorApiKey("groq-secret", MASTER_KEY);

    expect(ciphertext).not.toContain("groq-secret");
    expect(decryptAdvisorApiKey(ciphertext, MASTER_KEY)).toBe("groq-secret");
    expect(encryptAdvisorApiKey("groq-secret", MASTER_KEY)).not.toBe(
      ciphertext
    );
  });
});

describe("advisor provider manager", () => {
  it("proves the default Groq request contract before reporting success", async () => {
    const requestBodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(
      (
        _input: string | URL | Request,
        init?: RequestInit
      ): Promise<Response> => {
        if (typeof init?.body === "string") {
          requestBodies.push(JSON.parse(init.body) as Record<string, unknown>);
        }
        return Promise.resolve(
          new Response(`${CONTRACT_STREAM}\n\n`, {
            headers: { "content-type": "text/event-stream" },
            status: 200,
          })
        );
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      const fake = createRepository(null);
      const manager = createAdvisorProviderManager({
        repository: fake.repository,
        verifyZeroDataRetention: () => Promise.resolve(true),
      });

      await expect(
        manager.testConfiguration(validInput)
      ).resolves.toMatchObject({
        contractVerified: true,
        model: ADVISOR_MODEL_ID,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(requestBodies[0]).toMatchObject({
        max_tokens: 1024,
        model: ADVISOR_MODEL_ID,
        reasoning_effort: "none",
        stream: true,
      });
      const messages = requestBodies[0]?.messages;
      expect(
        Array.isArray(messages) &&
          messages.some(
            (message) =>
              typeof message === "object" &&
              message !== null &&
              "content" in message &&
              Array.isArray(message.content) &&
              (message.content as unknown[]).some(
                (part: unknown) =>
                  typeof part === "object" &&
                  part !== null &&
                  "type" in part &&
                  part.type === "image_url"
              )
          )
      ).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("preserves Groq authentication failures from the streaming contract check", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        Response.json(
          { error: { code: "invalid_api_key", message: "Invalid API Key" } },
          { status: 401 }
        )
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      const fake = createRepository(null);
      const manager = createAdvisorProviderManager({
        repository: fake.repository,
        verifyZeroDataRetention: () => Promise.resolve(false),
      });

      await expect(manager.testConfiguration(validInput)).rejects.toMatchObject(
        {
          code: "PROVIDER_AUTH_FAILED",
        }
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("tests a candidate without replacing the active configuration", async () => {
    const existing = createStoredConfig();
    const fake = createRepository(existing);
    const verifyContract = vi.fn(() => Promise.resolve());
    const manager = createAdvisorProviderManager({
      encryptionKey: MASTER_KEY,
      now: () => FIXED_NOW,
      repository: fake.repository,
      verifyContract,
      verifyZeroDataRetention: () => Promise.resolve(true),
    });

    await expect(manager.testConfiguration(validInput)).resolves.toMatchObject({
      contractVerified: true,
      model: ADVISOR_MODEL_ID,
    });
    expect(verifyContract).toHaveBeenCalledWith(validInput);
    expect(fake.repository.upsert).not.toHaveBeenCalled();
    expect(fake.getCurrent()).toBe(existing);
  });

  it("atomically activates a verified key with masked metadata", async () => {
    const fake = createRepository(null);
    const manager = createAdvisorProviderManager({
      encryptionKey: MASTER_KEY,
      now: () => FIXED_NOW,
      repository: fake.repository,
      verifyContract: () => Promise.resolve(),
      verifyZeroDataRetention: () => Promise.resolve(true),
    });

    const status = await manager.activateConfiguration(validInput);
    const saved = fake.getCurrent();

    expect(status).toMatchObject({
      configured: true,
      isPreview: true,
      isVisionCapable: true,
      keyLastFour: "cret",
      model: ADVISOR_MODEL_ID,
      provider: "groq",
      state: "ACTIVE",
    });
    expect(saved).not.toBeNull();
    expect(saved?.encryptedApiKey).not.toContain(validInput.apiKey);
    expect(decryptAdvisorApiKey(saved?.encryptedApiKey ?? "", MASTER_KEY)).toBe(
      validInput.apiKey
    );
  });

  it("does not replace the active key when ZDR verification fails", async () => {
    const existing = createStoredConfig();
    const fake = createRepository(existing);
    const manager = createAdvisorProviderManager({
      encryptionKey: MASTER_KEY,
      now: () => FIXED_NOW,
      repository: fake.repository,
      verifyContract: () => Promise.resolve(),
      verifyZeroDataRetention: () => Promise.resolve(false),
    });

    await expect(
      manager.activateConfiguration(validInput)
    ).rejects.toMatchObject({
      code: "ZDR_NOT_VERIFIED",
    });
    expect(fake.repository.upsert).not.toHaveBeenCalled();
    expect(fake.getCurrent()).toBe(existing);
  });

  it("keeps an active provider unavailable when ZDR is revoked", async () => {
    const fake = createRepository(createStoredConfig());
    const verifyZeroDataRetention = vi.fn(() => Promise.resolve(false));
    const manager = createAdvisorProviderManager({
      encryptionKey: MASTER_KEY,
      repository: fake.repository,
      verifyZeroDataRetention,
    });

    await expect(manager.getActiveModel()).resolves.toBeUndefined();
    await expect(manager.getStatus()).resolves.toMatchObject({
      lastErrorCode: "ZDR_NOT_VERIFIED",
      state: "UNAVAILABLE",
    });
    expect(verifyZeroDataRetention).toHaveBeenCalledTimes(2);
    expect(verifyZeroDataRetention).toHaveBeenNthCalledWith(1, "old-secret");
    expect(verifyZeroDataRetention).toHaveBeenNthCalledWith(2, "old-secret");
  });

  it("rejects unsupported models before contacting the provider", async () => {
    const fake = createRepository(null);
    const verifyContract = vi.fn(() => Promise.resolve());
    const manager = createAdvisorProviderManager({
      repository: fake.repository,
      verifyContract,
      verifyZeroDataRetention: () => Promise.resolve(false),
    });
    const unsupportedInput = {
      apiKey: "groq-new-secret",
      model: "llama-unsupported",
    } as unknown as AdvisorProviderConfigInput;

    await expect(
      manager.testConfiguration(unsupportedInput)
    ).rejects.toMatchObject({
      code: "MODEL_NOT_ALLOWLISTED",
    });
    expect(verifyContract).not.toHaveBeenCalled();
  });

  it("normalizes provider failures without exposing the candidate key", async () => {
    const fake = createRepository(null);
    const manager = createAdvisorProviderManager({
      encryptionKey: MASTER_KEY,
      repository: fake.repository,
      verifyContract: () => Promise.reject(new Error("provider groq-secret")),
      verifyZeroDataRetention: () => Promise.resolve(false),
    });

    await expect(manager.testConfiguration(validInput)).rejects.toMatchObject({
      code: "PROVIDER_CONTRACT_FAILED",
      message: "Groq provider contract verification failed.",
    });
    await expect(manager.testConfiguration(validInput)).rejects.not.toThrow(
      validInput.apiKey
    );
  });

  it("explains when Groq rejects the candidate API key", async () => {
    const fake = createRepository(null);
    const providerError = Object.assign(new Error("Invalid API Key"), {
      statusCode: 401,
    });
    const manager = createAdvisorProviderManager({
      encryptionKey: MASTER_KEY,
      repository: fake.repository,
      verifyContract: () => Promise.reject(providerError),
      verifyZeroDataRetention: () => Promise.resolve(false),
    });

    await expect(manager.testConfiguration(validInput)).rejects.toMatchObject({
      code: "PROVIDER_AUTH_FAILED",
      message:
        "Groq API key was rejected. Check that the key is active and can access the selected model.",
    });
  });

  it("explains when Groq rate-limits the contract check", async () => {
    const fake = createRepository(null);
    const providerError = Object.assign(new Error("Too Many Requests"), {
      statusCode: 429,
    });
    const manager = createAdvisorProviderManager({
      encryptionKey: MASTER_KEY,
      repository: fake.repository,
      verifyContract: () => Promise.reject(providerError),
      verifyZeroDataRetention: () => Promise.resolve(false),
    });

    await expect(manager.testConfiguration(validInput)).rejects.toMatchObject({
      code: "PROVIDER_RATE_LIMITED",
      message:
        "Groq rate limit reached. Wait briefly and retry the contract check.",
    });
  });

  it("explains when Groq cannot serve the preview model", async () => {
    const fake = createRepository(null);
    const providerError = Object.assign(new Error("Service Unavailable"), {
      statusCode: 503,
    });
    const manager = createAdvisorProviderManager({
      encryptionKey: MASTER_KEY,
      repository: fake.repository,
      verifyContract: () => Promise.reject(providerError),
      verifyZeroDataRetention: () => Promise.resolve(false),
    });

    await expect(manager.testConfiguration(validInput)).rejects.toMatchObject({
      code: "PROVIDER_UPSTREAM_UNAVAILABLE",
      message:
        "Groq could not serve the preview model right now. Retry shortly or check Groq status.",
    });
  });

  it("disables the active provider and removes it from runtime use", async () => {
    const fake = createRepository(createStoredConfig());
    const manager = createAdvisorProviderManager({
      encryptionKey: MASTER_KEY,
      repository: fake.repository,
      verifyZeroDataRetention: () => Promise.resolve(false),
    });

    await expect(manager.disableConfiguration()).resolves.toMatchObject({
      state: "DISABLED",
    });
    await expect(manager.getActiveModel()).resolves.toBeUndefined();
  });

  it("marks a runtime provider failure as unavailable without exposing a key", async () => {
    const fake = createRepository(createStoredConfig());
    const manager = createAdvisorProviderManager({
      encryptionKey: MASTER_KEY,
      repository: fake.repository,
      verifyZeroDataRetention: () => Promise.resolve(true),
    });

    await expect(
      manager.markUnavailable("old-fingerprint")
    ).resolves.toMatchObject({
      lastErrorCode: "PROVIDER_UNAVAILABLE",
      lastErrorMessage:
        "Groq provider is unavailable. Re-test or rotate the configuration.",
      state: "UNAVAILABLE",
    });
    expect(JSON.stringify(fake.getCurrent())).not.toContain("old-secret");
  });

  it("does not mark a rotated key unavailable from a stale runtime failure", async () => {
    const fake = createRepository(
      createStoredConfig({ keyFingerprint: "new-fingerprint" })
    );
    const manager = createAdvisorProviderManager({
      encryptionKey: MASTER_KEY,
      repository: fake.repository,
      verifyZeroDataRetention: () => Promise.resolve(true),
    });

    await expect(
      manager.markUnavailable("old-fingerprint")
    ).resolves.toMatchObject({
      state: "ACTIVE",
    });
    expect(fake.getCurrent()).toMatchObject({
      keyFingerprint: "new-fingerprint",
      state: "ACTIVE",
    });
  });

  it("surfaces an active row as unavailable when the master key is missing", async () => {
    const fake = createRepository(createStoredConfig());
    const manager = createAdvisorProviderManager({
      repository: fake.repository,
      verifyZeroDataRetention: () => Promise.resolve(false),
    });

    await expect(manager.getStatus()).resolves.toMatchObject({
      lastErrorCode: "KEY_UNAVAILABLE",
      state: "UNAVAILABLE",
    });
  });
});
