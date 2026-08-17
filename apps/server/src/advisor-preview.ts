import { convertToModelMessages, streamText } from "ai";
import type { LanguageModel, UIMessage } from "ai";
import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";

import {
  ADVISOR_MAX_OUTPUT_TOKENS,
  ADVISOR_MODEL_TIMEOUT_MS,
  advisorProviderOptions,
} from "./advisor-provider";

const ADVISOR_STREAM_ERROR = "ADVISOR_STREAM_ERROR" as const;
const ADVISOR_INVALID_REQUEST = "ADVISOR_INVALID_REQUEST" as const;
const ADVISOR_UNAVAILABLE = "ADVISOR_UNAVAILABLE" as const;
const ADVISOR_UNAUTHORIZED = "ADVISOR_UNAUTHORIZED" as const;

const hasBytes = (
  bytes: Uint8Array,
  expected: readonly number[],
  offset = 0
): boolean => expected.every((value, index) => bytes[offset + index] === value);

const isSupportedImageHeader = (
  mediaType: string,
  bytes: Uint8Array
): boolean => {
  if (mediaType === "image/jpeg") {
    return hasBytes(bytes, [0xff, 0xd8, 0xff]);
  }

  if (mediaType === "image/png") {
    return hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }

  return (
    hasBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    hasBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  );
};

const inlineImageDataUrl = z
  .string()
  .max(4_500_000)
  .superRefine((value, ctx) => {
    const match = value.match(
      /^data:(?<mediaType>image\/(?:jpeg|png|webp));base64,(?<payload>[A-Za-z0-9+/]+={0,2})$/u
    );
    const mediaType = match?.groups?.mediaType;
    const payload = match?.groups?.payload;
    if (!mediaType || !payload) {
      ctx.addIssue({
        code: "custom",
        message: "Use inline JPEG, PNG, or WebP data for preview images.",
      });
      return;
    }

    try {
      const binary = atob(payload);
      const bytes = Uint8Array.from(
        binary,
        (character) => character.codePointAt(0) ?? 0
      );
      if (!isSupportedImageHeader(mediaType, bytes)) {
        ctx.addIssue({
          code: "custom",
          message: "The preview image bytes do not match their declared type.",
        });
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Use inline JPEG, PNG, or WebP data for preview images.",
      });
    }
  });

const previewMessagePart = z.discriminatedUnion("type", [
  z.object({
    state: z.enum(["streaming", "done"]).optional(),
    text: z.string().max(20_000),
    type: z.literal("text"),
  }),
  z.object({
    filename: z.string().max(255).optional(),
    mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    type: z.literal("file"),
    url: inlineImageDataUrl,
  }),
]);

const previewMessage = z.object({
  id: z.string().min(1).max(128),
  parts: z.array(previewMessagePart).min(1).max(20),
  role: z.enum(["user", "assistant"]),
});

const previewRequest = z.object({
  messages: z.array(previewMessage).min(1).max(32),
});

const PREVIEW_SYSTEM_PROMPT = `You are Avin's internal Service Advisor preview. Reply concisely in Vietnamese. Use only information present in the participant's message or image. Do not claim that you performed an action, accessed a marketplace record, or completed a purchase.`;

export interface AdvisorPreviewDependencies {
  getModel: () =>
    | LanguageModel
    | PromiseLike<LanguageModel | undefined>
    | undefined;
  getProviderKeyFingerprint?: () =>
    | string
    | PromiseLike<string | undefined>
    | undefined;
  isAuthorized: (request: Request) => boolean | PromiseLike<boolean>;
  reportProviderError?: (keyFingerprint?: string) => void | PromiseLike<void>;
}

const invalidRequest = (c: Context) =>
  c.json(
    {
      code: ADVISOR_INVALID_REQUEST,
      message: "Use inline JPEG, PNG, or WebP data for preview images.",
    },
    400
  );

export const createAdvisorPreviewApp = ({
  getModel,
  getProviderKeyFingerprint,
  isAuthorized,
  reportProviderError,
}: AdvisorPreviewDependencies): Hono => {
  const app = new Hono();

  const reportProviderFailure = async (
    keyFingerprint?: string
  ): Promise<void> => {
    try {
      await reportProviderError?.(keyFingerprint);
    } catch {
      // Provider status reporting must not alter the safe preview response.
    }
  };

  app.post("/api/advisor/preview", async (c) => {
    let authorized = false;
    try {
      authorized = await isAuthorized(c.req.raw);
    } catch {
      authorized = false;
    }

    if (!authorized) {
      return c.json(
        {
          code: ADVISOR_UNAUTHORIZED,
          message: "Sign in to use the internal Service Advisor preview.",
        },
        401
      );
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return invalidRequest(c);
    }

    const parsed = previewRequest.safeParse(body);
    if (!parsed.success) {
      return invalidRequest(c);
    }

    const finalMessage = parsed.data.messages.at(-1);
    if (finalMessage?.role !== "user") {
      return c.json(
        {
          code: ADVISOR_INVALID_REQUEST,
          message: "The final preview message must be from the user.",
        },
        400
      );
    }

    let providerKeyFingerprint: string | undefined;
    try {
      providerKeyFingerprint = await getProviderKeyFingerprint?.();
    } catch {
      providerKeyFingerprint = undefined;
    }

    let model: LanguageModel | undefined;
    try {
      model = await getModel();
    } catch {
      void reportProviderFailure(providerKeyFingerprint);
      return c.json(
        {
          code: ADVISOR_UNAVAILABLE,
          message: "The Service Advisor preview is not configured.",
        },
        503
      );
    }
    if (!model) {
      return c.json(
        {
          code: ADVISOR_UNAVAILABLE,
          message: "The Service Advisor preview is not configured.",
        },
        503
      );
    }

    try {
      const messages: UIMessage[] = parsed.data.messages;
      const result = streamText({
        abortSignal: c.req.raw.signal,
        maxOutputTokens: ADVISOR_MAX_OUTPUT_TOKENS,
        maxRetries: 0,
        messages: await convertToModelMessages(messages),
        model,
        onError: () => {
          if (c.req.raw.signal.aborted) {
            return;
          }
          return reportProviderFailure(providerKeyFingerprint);
        },
        providerOptions: advisorProviderOptions,
        system: PREVIEW_SYSTEM_PROMPT,
        timeout: ADVISOR_MODEL_TIMEOUT_MS,
      });

      return result.toUIMessageStreamResponse({
        onError: () => ADVISOR_STREAM_ERROR,
        originalMessages: messages,
        sendReasoning: false,
        sendSources: false,
      });
    } catch {
      void reportProviderFailure(providerKeyFingerprint);
      return c.json(
        {
          code: ADVISOR_STREAM_ERROR,
          message: "The Service Advisor preview could not complete this turn.",
        },
        502
      );
    }
  });

  return app;
};
