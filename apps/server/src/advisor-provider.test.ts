import { streamText } from "ai";
import { describe, expect, it, vi } from "vitest";

import {
  ADVISOR_MAX_OUTPUT_TOKENS,
  ADVISOR_MODEL_ID,
  ADVISOR_REASONING_EFFORT,
  createAdvisorModel,
} from "./advisor-provider";
import type { AdvisorProviderFetch } from "./advisor-provider";

const streamBody = [
  `data: ${JSON.stringify({
    choices: [
      {
        delta: { content: "Xin chào" },
        finish_reason: null,
        index: 0,
      },
    ],
    id: "chatcmpl-preview",
    model: ADVISOR_MODEL_ID,
    object: "chat.completion.chunk",
  })}`,
  `data: ${JSON.stringify({
    choices: [
      {
        delta: {},
        finish_reason: "stop",
        index: 0,
      },
    ],
    id: "chatcmpl-preview",
    model: ADVISOR_MODEL_ID,
    object: "chat.completion.chunk",
  })}`,
  "data: [DONE]",
].join("\n\n");

const createFakeFetch = () => {
  let request: RequestInit | undefined;
  let url: string | URL | undefined;

  const fetch = vi.fn((input: string | URL, init?: RequestInit) => {
    url = input;
    request = init;
    return new Response(`${streamBody}\n\n`, {
      headers: { "content-type": "text/event-stream" },
      status: 200,
    });
  });

  return {
    fetch,
    getRequest: () => request,
    getUrl: () => url,
  };
};

const readRequestBody = (request: RequestInit | undefined) => {
  if (typeof request?.body !== "string") {
    throw new TypeError("Expected the provider request body to be JSON");
  }

  return JSON.parse(request.body) as {
    messages: {
      content:
        | string
        | {
            image_url?: { url: string };
            text?: string;
            type: string;
          }[];
      role: string;
    }[];
    max_tokens: number;
    model: string;
    reasoning_effort: string;
    stream: boolean;
  };
};

describe("createAdvisorModel", () => {
  it("uses the approved Groq model contract and disables reasoning", async () => {
    const fake = createFakeFetch();
    const model = createAdvisorModel({
      apiKey: "groq-test-key",
      fetch: fake.fetch as unknown as AdvisorProviderFetch,
    });

    const result = streamText({
      maxOutputTokens: ADVISOR_MAX_OUTPUT_TOKENS,
      messages: [{ content: "Xin chào", role: "user" }],
      model,
      providerOptions: {
        groq: {
          reasoningEffort: ADVISOR_REASONING_EFFORT,
        },
      },
    });

    await expect(result.text).resolves.toBe("Xin chào");

    const body = readRequestBody(fake.getRequest());
    expect(fake.getUrl()).toBe(
      "https://api.groq.com/openai/v1/chat/completions"
    );
    expect(body).toMatchObject({
      max_tokens: ADVISOR_MAX_OUTPUT_TOKENS,
      model: ADVISOR_MODEL_ID,
      reasoning_effort: ADVISOR_REASONING_EFFORT,
      stream: true,
    });
  });

  it("converts a data URL image to an inline Groq image part", async () => {
    const fake = createFakeFetch();
    const model = createAdvisorModel({
      apiKey: "groq-test-key",
      fetch: fake.fetch as unknown as AdvisorProviderFetch,
    });

    const result = streamText({
      maxOutputTokens: ADVISOR_MAX_OUTPUT_TOKENS,
      messages: [
        {
          content: [
            { text: "What is in this image?", type: "text" },
            {
              data: new Uint8Array([137, 80, 78, 71]),
              mediaType: "image/png",
              type: "file",
            },
          ],
          role: "user",
        },
      ],
      model,
      providerOptions: {
        groq: { reasoningEffort: ADVISOR_REASONING_EFFORT },
      },
    });

    await expect(result.text).resolves.toBe("Xin chào");

    const body = readRequestBody(fake.getRequest());
    const content = body.messages[0]?.content;
    expect(Array.isArray(content)).toBe(true);
    expect(content).toEqual([
      { text: "What is in this image?", type: "text" },
      {
        image_url: {
          url: "data:image/png;base64,iVBORw==",
        },
        type: "image_url",
      },
    ]);
    const imageParts = Array.isArray(content) ? content : [];
    expect(
      imageParts.some((part) => part.image_url?.url.startsWith("https://"))
    ).toBe(false);
  });

  it("passes request cancellation to an in-flight Groq transport", async () => {
    let request: RequestInit | undefined;
    let cancelled = false;
    const fetch = vi.fn((_input: string | URL, init?: RequestInit) => {
      request = init;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          const firstChunk = streamBody.split("\n\n", 1)[0] ?? streamBody;
          controller.enqueue(new TextEncoder().encode(`${firstChunk}\n\n`));
          init?.signal?.addEventListener(
            "abort",
            () => {
              cancelled = true;
              controller.error(new Error("request aborted"));
            },
            { once: true }
          );
        },
      });

      return Promise.resolve(
        new Response(body, {
          headers: { "content-type": "text/event-stream" },
          status: 200,
        })
      );
    });
    const model = createAdvisorModel({
      apiKey: "groq-test-key",
      fetch: fetch as unknown as AdvisorProviderFetch,
    });
    const controller = new AbortController();

    const result = streamText({
      abortSignal: controller.signal,
      messages: [{ content: "Stop this", role: "user" }],
      model,
    });

    const pending = result.consumeStream();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    controller.abort();
    await pending;

    expect(request?.signal).toBe(controller.signal);
    expect(request?.signal?.aborted).toBe(true);
    expect(cancelled).toBe(true);
  });
});
