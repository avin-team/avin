import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { adminProcedure } from "../access/procedures";
import type { AuditEvent, Context } from "../runtime/context";
import { advisorPublicRouter } from "./advisor-router";
import {
  advisorProviderConfigInputSchema,
  ADVISOR_PROVIDER_ID,
} from "./provider";

const providerTarget = {
  targetId: ADVISOR_PROVIDER_ID,
  targetType: "ADVISOR_PROVIDER",
} as const;

const getProviderManager = (context: Context) => {
  if (!context.advisorProvider) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Service Advisor provider configuration is unavailable.",
    });
  }

  return context.advisorProvider;
};

const normalizeProviderError = (error: unknown) => {
  if (error instanceof ORPCError) {
    return error;
  }

  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : null;
  const messages: Record<
    string,
    {
      code: "BAD_REQUEST" | "PRECONDITION_FAILED" | "SERVICE_UNAVAILABLE";
      message: string;
    }
  > = {
    EMPTY_PROVIDER_RESPONSE: {
      code: "BAD_REQUEST",
      message:
        "Groq provider contract verification returned an empty response.",
    },
    ENCRYPTION_KEY_UNAVAILABLE: {
      code: "SERVICE_UNAVAILABLE",
      message: "Provider configuration encryption is unavailable.",
    },
    INVALID_CIPHERTEXT: {
      code: "SERVICE_UNAVAILABLE",
      message: "Provider configuration ciphertext is invalid.",
    },
    MODEL_NOT_ALLOWLISTED: {
      code: "BAD_REQUEST",
      message: "The configured provider model is not on the tested allowlist.",
    },
    PROVIDER_AUTH_FAILED: {
      code: "BAD_REQUEST",
      message:
        "Groq API key was rejected. Check that the key is active and can access the selected model.",
    },
    PROVIDER_CONTRACT_FAILED: {
      code: "BAD_REQUEST",
      message: "Groq provider contract verification failed.",
    },
    PROVIDER_MODEL_UNAVAILABLE: {
      code: "BAD_REQUEST",
      message:
        "Groq does not make the selected model available to this key or project.",
    },
    PROVIDER_RATE_LIMITED: {
      code: "SERVICE_UNAVAILABLE",
      message:
        "Groq rate limit reached. Wait briefly and retry the contract check.",
    },
    PROVIDER_REQUEST_REJECTED: {
      code: "BAD_REQUEST",
      message:
        "Groq rejected the verification request. Check that this key can use the selected vision model.",
    },
    PROVIDER_TIMEOUT: {
      code: "SERVICE_UNAVAILABLE",
      message: "Groq contract verification timed out. Retry shortly.",
    },
    PROVIDER_UNAVAILABLE: {
      code: "SERVICE_UNAVAILABLE",
      message:
        "Groq is temporarily unavailable or rate-limited. Try again shortly.",
    },
    PROVIDER_UPSTREAM_UNAVAILABLE: {
      code: "SERVICE_UNAVAILABLE",
      message:
        "Groq could not serve the preview model right now. Retry shortly or check Groq status.",
    },
    ZDR_CHECK_FAILED: {
      code: "PRECONDITION_FAILED",
      message: "Groq Zero Data Retention could not be verified.",
    },
    ZDR_NOT_VERIFIED: {
      code: "PRECONDITION_FAILED",
      message: "Groq Zero Data Retention must be verified before activation.",
    },
  };
  const normalized = code ? messages[code] : undefined;
  if (normalized) {
    return new ORPCError(normalized.code, { message: normalized.message });
  }

  return new ORPCError("SERVICE_UNAVAILABLE", {
    message: "Service Advisor provider configuration is unavailable.",
  });
};

const runAuditedProviderAction = async <Result>({
  action,
  context,
  model,
  run,
}: {
  action: string;
  context: Context;
  model?: string | (() => string | undefined);
  run: () => Promise<Result>;
}): Promise<Result> => {
  const auditEvent = {
    action,
    actorUserId: context.session?.user.id ?? "",
    ...providerTarget,
  } as const;
  const recordAudit = async (outcome: AuditEvent["outcome"]): Promise<void> => {
    const modelValue = typeof model === "function" ? model() : model;
    await context.audit.record({
      ...auditEvent,
      metadata: modelValue ? { model: modelValue } : undefined,
      outcome,
    });
  };

  try {
    const result = await run();
    await recordAudit("SUCCESS");
    return result;
  } catch (error) {
    await recordAudit("FAILURE");
    throw normalizeProviderError(error);
  }
};

export const advisorRouter = {
  ...advisorPublicRouter,
  provider: {
    activate: adminProcedure
      .input(advisorProviderConfigInputSchema)
      .handler(({ context, input }) =>
        runAuditedProviderAction({
          action: "advisor.provider.activate",
          context,
          model: input.model,
          run: () => getProviderManager(context).activateConfiguration(input),
        })
      ),

    disable: adminProcedure.input(z.object({})).handler(({ context }) => {
      const provider = getProviderManager(context);
      let configuredModel: string | undefined;
      return runAuditedProviderAction({
        action: "advisor.provider.disable",
        context,
        model: () => configuredModel,
        run: async () => {
          const currentStatus = await provider.getStatus();
          configuredModel = currentStatus.model ?? undefined;
          return provider.disableConfiguration();
        },
      });
    }),

    get: adminProcedure.handler(async ({ context }) => {
      try {
        return await getProviderManager(context).getStatus();
      } catch {
        throw new ORPCError("SERVICE_UNAVAILABLE", {
          message: "Service Advisor provider configuration is unavailable.",
        });
      }
    }),

    test: adminProcedure
      .input(advisorProviderConfigInputSchema)
      .handler(({ context, input }) =>
        runAuditedProviderAction({
          action: "advisor.provider.test",
          context,
          model: input.model,
          run: () => getProviderManager(context).testConfiguration(input),
        })
      ),
  },
};
