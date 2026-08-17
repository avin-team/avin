import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import {
  ADVISOR_MODEL_ID,
  ADVISOR_PROVIDER_ID,
} from "@avin/api/advisor/provider";
import type {
  AdvisorProviderConfigInput,
  AdvisorProviderManager,
  AdvisorProviderState,
  AdvisorProviderStatus,
  AdvisorProviderTestResult,
} from "@avin/api/advisor/provider";
import type { db } from "@avin/db";
import { advisorProviderConfig } from "@avin/db/schema/advisor";
import { streamText } from "ai";
import { and, eq } from "drizzle-orm";

import {
  ADVISOR_MAX_OUTPUT_TOKENS,
  ADVISOR_MODEL_TIMEOUT_MS,
  advisorProviderOptions,
  createAdvisorModel,
} from "./advisor-provider";
import type { AdvisorProviderFetch } from "./advisor-provider";

export class AdvisorProviderConfigurationError extends Error {
  readonly code: string;
  readonly name = "AdvisorProviderConfigurationError";

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const ENCRYPTION_VERSION = "v1" as const;
const ENCRYPTION_ALGORITHM = "aes-256-gcm" as const;
const ENCRYPTION_IV_BYTES = 12;
const ENCRYPTION_KEY_BYTES = 32;
const CONTRACT_IMAGE_DATA = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasVisionMessagePart = (messages: unknown): boolean => {
  if (!Array.isArray(messages)) {
    return false;
  }

  for (const message of messages) {
    if (!isJsonObject(message) || !Array.isArray(message.content)) {
      continue;
    }

    if (
      message.content.some(
        (part) => isJsonObject(part) && part.type === "image_url"
      )
    ) {
      return true;
    }
  }

  return false;
};

const assertProviderContract = (requestBody: unknown, model: string): void => {
  if (!isJsonObject(requestBody)) {
    throw new AdvisorProviderConfigurationError(
      "PROVIDER_CONTRACT_FAILED",
      "Groq provider contract verification failed."
    );
  }

  const isContractValid =
    requestBody.max_tokens === ADVISOR_MAX_OUTPUT_TOKENS &&
    requestBody.model === model &&
    requestBody.reasoning_effort === "none" &&
    requestBody.stream === true &&
    hasVisionMessagePart(requestBody.messages);
  if (!isContractValid) {
    throw new AdvisorProviderConfigurationError(
      "PROVIDER_CONTRACT_FAILED",
      "Groq provider contract verification failed."
    );
  }
};

export interface AdvisorProviderStoredConfig {
  contractVerifiedAt: Date | null;
  disabledAt: Date | null;
  encryptedApiKey: string;
  keyFingerprint: string;
  keyLastFour: string;
  lastCheckedAt: Date | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  model: string;
  provider: typeof ADVISOR_PROVIDER_ID;
  state: AdvisorProviderState;
  zdrVerifiedAt: Date | null;
}

export interface AdvisorProviderRepository {
  disable: (disabledAt: Date) => Promise<AdvisorProviderStoredConfig | null>;
  get: () => Promise<AdvisorProviderStoredConfig | null>;
  markUnavailable: (
    checkedAt: Date,
    keyFingerprint: string
  ) => Promise<AdvisorProviderStoredConfig | null>;
  upsert: (
    config: AdvisorProviderStoredConfig
  ) => Promise<AdvisorProviderStoredConfig>;
}

export interface CreateAdvisorProviderManagerOptions {
  encryptionKey?: string;
  now?: () => Date;
  repository: AdvisorProviderRepository;
  verifyContract?: (input: AdvisorProviderConfigInput) => Promise<void>;
  verifyZeroDataRetention: (apiKey: string) => Promise<boolean>;
}

const deriveEncryptionKey = (masterKey: string): Buffer =>
  createHash("sha256").update(masterKey).digest();

const requireEncryptionKey = (masterKey: string | undefined): string => {
  if (!masterKey || masterKey.trim().length < ENCRYPTION_KEY_BYTES) {
    throw new AdvisorProviderConfigurationError(
      "ENCRYPTION_KEY_UNAVAILABLE",
      "Provider configuration encryption is unavailable."
    );
  }

  return masterKey;
};

export const encryptAdvisorApiKey = (
  apiKey: string,
  masterKey: string
): string => {
  const iv = randomBytes(ENCRYPTION_IV_BYTES);
  const cipher = createCipheriv(
    ENCRYPTION_ALGORITHM,
    deriveEncryptionKey(requireEncryptionKey(masterKey)),
    iv
  );
  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
};

export const decryptAdvisorApiKey = (
  ciphertext: string,
  masterKey: string
): string => {
  const [version, ivValue, authTagValue, encryptedValue] =
    ciphertext.split(".");
  if (
    version !== ENCRYPTION_VERSION ||
    !ivValue ||
    !authTagValue ||
    !encryptedValue
  ) {
    throw new AdvisorProviderConfigurationError(
      "INVALID_CIPHERTEXT",
      "Provider configuration ciphertext is invalid."
    );
  }

  try {
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      deriveEncryptionKey(requireEncryptionKey(masterKey)),
      Buffer.from(ivValue, "base64url")
    );
    decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf-8");
  } catch {
    throw new AdvisorProviderConfigurationError(
      "INVALID_CIPHERTEXT",
      "Provider configuration ciphertext is invalid."
    );
  }
};

export const fingerprintAdvisorApiKey = (apiKey: string): string =>
  createHash("sha256").update(apiKey).digest("hex");

const keyLastFour = (apiKey: string): string =>
  apiKey.slice(-4).padStart(4, "•");

const statusFor = (
  config: AdvisorProviderStoredConfig | null
): AdvisorProviderStatus => {
  if (!config) {
    return {
      configured: false,
      contractVerifiedAt: null,
      disabledAt: null,
      isPreview: false,
      isVisionCapable: false,
      keyLastFour: null,
      lastCheckedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      model: null,
      provider: ADVISOR_PROVIDER_ID,
      state: "DISABLED",
      zdrVerifiedAt: null,
    };
  }

  return {
    configured: true,
    contractVerifiedAt: config.contractVerifiedAt?.toISOString() ?? null,
    disabledAt: config.disabledAt?.toISOString() ?? null,
    isPreview: config.model === ADVISOR_MODEL_ID,
    isVisionCapable: config.model === ADVISOR_MODEL_ID,
    keyLastFour: config.keyLastFour,
    lastCheckedAt: config.lastCheckedAt?.toISOString() ?? null,
    lastErrorCode: config.lastErrorCode,
    lastErrorMessage: config.lastErrorMessage,
    model: config.model,
    provider: ADVISOR_PROVIDER_ID,
    state: config.state,
    zdrVerifiedAt: config.zdrVerifiedAt?.toISOString() ?? null,
  };
};

const safeProviderError = (
  error: unknown
): AdvisorProviderConfigurationError => {
  if (error instanceof AdvisorProviderConfigurationError) {
    return error;
  }

  return new AdvisorProviderConfigurationError(
    "PROVIDER_CONTRACT_FAILED",
    "Groq provider contract verification failed."
  );
};

export const verifyAdvisorProviderContract = async ({
  apiKey,
  model,
}: AdvisorProviderConfigInput): Promise<void> => {
  let requestBody: unknown;
  const captureFetch = Object.assign(
    (
      input: Parameters<AdvisorProviderFetch>[0],
      init?: Parameters<AdvisorProviderFetch>[1]
    ) => {
      if (typeof init?.body === "string") {
        try {
          requestBody = JSON.parse(init.body) as unknown;
        } catch {
          requestBody = undefined;
        }
      }

      return globalThis.fetch(input, init);
    },
    { preconnect: globalThis.fetch.preconnect }
  ) as AdvisorProviderFetch;

  const result = streamText({
    maxOutputTokens: ADVISOR_MAX_OUTPUT_TOKENS,
    maxRetries: 0,
    messages: [
      {
        content: [
          { text: "Reply with exactly OK.", type: "text" },
          {
            data: CONTRACT_IMAGE_DATA,
            mediaType: "image/png",
            type: "file",
          },
        ],
        role: "user",
      },
    ],
    model: createAdvisorModel({ apiKey, fetch: captureFetch }),
    onError: ({ error }) => {
      safeProviderError(error);
    },
    providerOptions: advisorProviderOptions,
    timeout: ADVISOR_MODEL_TIMEOUT_MS,
  });
  const response = await result.text;
  if (!response.trim()) {
    throw new AdvisorProviderConfigurationError(
      "EMPTY_PROVIDER_RESPONSE",
      "Groq provider contract verification returned an empty response."
    );
  }

  assertProviderContract(requestBody, model);
};

export const createAdvisorProviderManager = ({
  encryptionKey,
  now = () => new Date(),
  repository,
  verifyContract = verifyAdvisorProviderContract,
  verifyZeroDataRetention,
}: CreateAdvisorProviderManagerOptions): AdvisorProviderManager & {
  getActiveKeyFingerprint: () => Promise<string | undefined>;
  getActiveModel: () => Promise<
    ReturnType<typeof createAdvisorModel> | undefined
  >;
} => {
  const assertSupportedModel = (input: AdvisorProviderConfigInput): void => {
    if (input.model !== ADVISOR_MODEL_ID) {
      throw new AdvisorProviderConfigurationError(
        "MODEL_NOT_ALLOWLISTED",
        "The configured provider model is not on the tested allowlist."
      );
    }
  };

  const testConfiguration = async (
    input: AdvisorProviderConfigInput
  ): Promise<AdvisorProviderTestResult> => {
    assertSupportedModel(input);
    try {
      await verifyContract(input);
    } catch (error) {
      throw safeProviderError(error);
    }

    return {
      contractVerified: true,
      message: "Groq provider contract verified. The key is not active yet.",
      model: ADVISOR_MODEL_ID,
      provider: ADVISOR_PROVIDER_ID,
    };
  };

  const activateConfiguration = async (
    input: AdvisorProviderConfigInput
  ): Promise<AdvisorProviderStatus> => {
    assertSupportedModel(input);
    const masterKey = requireEncryptionKey(encryptionKey);
    try {
      await verifyContract(input);
    } catch (error) {
      throw safeProviderError(error);
    }

    let zdrVerified = false;
    try {
      zdrVerified = await verifyZeroDataRetention(input.apiKey);
    } catch {
      throw new AdvisorProviderConfigurationError(
        "ZDR_CHECK_FAILED",
        "Groq Zero Data Retention could not be verified."
      );
    }
    if (!zdrVerified) {
      throw new AdvisorProviderConfigurationError(
        "ZDR_NOT_VERIFIED",
        "Groq Zero Data Retention must be verified before activation."
      );
    }

    const checkedAt = now();
    const encryptedApiKey = encryptAdvisorApiKey(input.apiKey, masterKey);
    const saved = await repository.upsert({
      contractVerifiedAt: checkedAt,
      disabledAt: null,
      encryptedApiKey,
      keyFingerprint: fingerprintAdvisorApiKey(input.apiKey),
      keyLastFour: keyLastFour(input.apiKey),
      lastCheckedAt: checkedAt,
      lastErrorCode: null,
      lastErrorMessage: null,
      model: input.model,
      provider: ADVISOR_PROVIDER_ID,
      state: "ACTIVE",
      zdrVerifiedAt: checkedAt,
    });

    return statusFor(saved);
  };

  const disableConfiguration = async (): Promise<AdvisorProviderStatus> => {
    const disabled = await repository.disable(now());
    return statusFor(disabled);
  };

  const markUnavailable = async (
    keyFingerprint?: string
  ): Promise<AdvisorProviderStatus> => {
    if (!keyFingerprint) {
      return statusFor(await repository.get());
    }

    const unavailable = await repository.markUnavailable(now(), keyFingerprint);
    return statusFor(unavailable ?? (await repository.get()));
  };

  return {
    activateConfiguration,
    disableConfiguration,
    getActiveKeyFingerprint: async () => {
      const active = await repository.get();
      if (
        !active ||
        active.state !== "ACTIVE" ||
        active.model !== ADVISOR_MODEL_ID
      ) {
        return;
      }

      return active.keyFingerprint;
    },
    getActiveModel: async () => {
      const active = await repository.get();
      if (
        !active ||
        active.state !== "ACTIVE" ||
        active.model !== ADVISOR_MODEL_ID
      ) {
        return;
      }

      if (!active.contractVerifiedAt || !active.zdrVerifiedAt) {
        return;
      }

      try {
        const apiKey = decryptAdvisorApiKey(
          active.encryptedApiKey,
          requireEncryptionKey(encryptionKey)
        );

        if (!(await verifyZeroDataRetention(apiKey))) {
          return;
        }

        return createAdvisorModel({ apiKey });
      } catch {
        // A corrupt ciphertext makes the provider unavailable until rotated.
      }
    },
    getStatus: async () => {
      const config = await repository.get();
      const status = statusFor(config);
      if (!config || config.state !== "ACTIVE") {
        return status;
      }
      if (config.model !== ADVISOR_MODEL_ID) {
        return {
          ...status,
          lastErrorCode: "MODEL_NOT_ALLOWLISTED",
          lastErrorMessage:
            "The configured provider model is not on the tested allowlist.",
          state: "INVALID",
        };
      }

      if (!config.contractVerifiedAt || !config.zdrVerifiedAt) {
        return {
          ...status,
          lastErrorCode: "CONTRACT_NOT_VERIFIED",
          lastErrorMessage:
            "Provider configuration has not passed the required verification gates.",
          state: "INVALID",
        };
      }

      let masterKey: string;
      try {
        masterKey = requireEncryptionKey(encryptionKey);
      } catch {
        return {
          ...status,
          lastErrorCode: "KEY_UNAVAILABLE",
          lastErrorMessage:
            "Provider configuration is unavailable on this server.",
          state: "UNAVAILABLE",
        };
      }

      let apiKey: string;
      try {
        apiKey = decryptAdvisorApiKey(config.encryptedApiKey, masterKey);
      } catch {
        return {
          ...status,
          lastErrorCode: "KEY_UNAVAILABLE",
          lastErrorMessage:
            "Provider configuration is unavailable on this server.",
          state: "UNAVAILABLE",
        };
      }

      try {
        if (!(await verifyZeroDataRetention(apiKey))) {
          return {
            ...status,
            lastErrorCode: "ZDR_NOT_VERIFIED",
            lastErrorMessage:
              "Groq Zero Data Retention is no longer verified for this key.",
            state: "UNAVAILABLE",
          };
        }
      } catch {
        return {
          ...status,
          lastErrorCode: "ZDR_CHECK_FAILED",
          lastErrorMessage:
            "Groq Zero Data Retention could not be verified on this server.",
          state: "UNAVAILABLE",
        };
      }

      return status;
    },
    markUnavailable,
    testConfiguration,
  };
};

const mapStoredConfig = (
  config: typeof advisorProviderConfig.$inferSelect
): AdvisorProviderStoredConfig => ({
  contractVerifiedAt: config.contractVerifiedAt,
  disabledAt: config.disabledAt,
  encryptedApiKey: config.encryptedApiKey,
  keyFingerprint: config.keyFingerprint,
  keyLastFour: config.keyLastFour,
  lastCheckedAt: config.lastCheckedAt,
  lastErrorCode: config.lastErrorCode,
  lastErrorMessage: config.lastErrorMessage,
  model: config.model,
  provider: ADVISOR_PROVIDER_ID,
  state: config.state,
  zdrVerifiedAt: config.zdrVerifiedAt,
});

export const createAdvisorProviderRepository = (
  database: typeof db
): AdvisorProviderRepository => ({
  disable: async (disabledAt) => {
    const [updated] = await database
      .update(advisorProviderConfig)
      .set({
        disabledAt,
        lastErrorCode: null,
        lastErrorMessage: null,
        state: "DISABLED",
        updatedAt: disabledAt,
      })
      .where(eq(advisorProviderConfig.provider, ADVISOR_PROVIDER_ID))
      .returning();
    return updated ? mapStoredConfig(updated) : null;
  },
  get: async () => {
    const found = await database.query.advisorProviderConfig.findFirst({
      where: eq(advisorProviderConfig.provider, ADVISOR_PROVIDER_ID),
    });
    return found ? mapStoredConfig(found) : null;
  },
  markUnavailable: async (checkedAt, keyFingerprint) => {
    const [updated] = await database
      .update(advisorProviderConfig)
      .set({
        lastCheckedAt: checkedAt,
        lastErrorCode: "PROVIDER_UNAVAILABLE",
        lastErrorMessage:
          "Groq provider is unavailable. Re-test or rotate the configuration.",
        state: "UNAVAILABLE",
        updatedAt: checkedAt,
      })
      .where(
        and(
          eq(advisorProviderConfig.provider, ADVISOR_PROVIDER_ID),
          eq(advisorProviderConfig.state, "ACTIVE"),
          eq(advisorProviderConfig.keyFingerprint, keyFingerprint)
        )
      )
      .returning();
    return updated ? mapStoredConfig(updated) : null;
  },
  upsert: async (config) => {
    const [saved] = await database
      .insert(advisorProviderConfig)
      .values(config)
      .onConflictDoUpdate({
        set: config,
        target: advisorProviderConfig.provider,
      })
      .returning();
    if (!saved) {
      throw new Error("Provider configuration was not saved");
    }
    return mapStoredConfig(saved);
  },
});
