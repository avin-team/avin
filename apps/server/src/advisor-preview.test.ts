import { describe, expect, it, vi } from "vitest";

import { createAdvisorPreviewApp } from "./advisor-preview";
import { createAdvisorModel } from "./advisor-provider";
import type { AdvisorProviderFetch } from "./advisor-provider";

const createProviderStream = (content: string) =>
  `${[
    `data: ${JSON.stringify({
      choices: [
        {
          delta: { content },
          finish_reason: null,
          index: 0,
        },
      ],
      id: "chatcmpl-preview",
      model: "qwen/qwen3.6-27b",
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
      model: "qwen/qwen3.6-27b",
      object: "chat.completion.chunk",
    })}`,
    "data: [DONE]",
  ].join("\n\n")}\n\n`;

const SAMPLE_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const createModel = (body: string, status = 200) => {
  const fetch = vi.fn(
    (_input: string | URL, _init?: RequestInit) =>
      new Response(body, {
        headers: { "content-type": "text/event-stream" },
        status,
      })
  );

  return {
    fetch,
    model: createAdvisorModel({
      apiKey: "groq-test-key",
      fetch: fetch as unknown as AdvisorProviderFetch,
    }),
  };
};

const request = (messages: unknown) =>
  new Request("http://localhost/api/advisor/preview", {
    body: JSON.stringify({ messages }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

describe("Service Advisor preview endpoint", () => {
  it("keeps the internal preview behind the authenticated seam", async () => {
    const provider = createModel(createProviderStream("ignored"));
    const app = createAdvisorPreviewApp({
      getModel: () => provider.model,
      isAuthorized: () => false,
    });

    const response = await app.request(
      request([
        {
          id: "message-1",
          parts: [{ text: "Xin chào", type: "text" }],
          role: "user",
        },
      ])
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "ADVISOR_UNAUTHORIZED",
      message: "Sign in to use the internal Service Advisor preview.",
    });
    expect(provider.fetch).not.toHaveBeenCalled();
  });

  it("returns the AI SDK UI Message Stream for a text turn", async () => {
    const provider = createModel(createProviderStream("Xin chào"));
    const app = createAdvisorPreviewApp({
      getModel: () => provider.model,
      isAuthorized: () => true,
    });

    const response = await app.request(
      request([
        {
          id: "message-1",
          parts: [{ text: "Xin chào", type: "text" }],
          role: "user",
        },
      ])
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await expect(response.text()).resolves.toContain("Xin chào");
    expect(provider.fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects image parts that use a public URL", async () => {
    const provider = createModel(createProviderStream("ignored"));
    const app = createAdvisorPreviewApp({
      getModel: () => provider.model,
      isAuthorized: () => true,
    });

    const response = await app.request(
      request([
        {
          id: "message-1",
          parts: [
            {
              mediaType: "image/png",
              type: "file",
              url: "https://example.com/private.png",
            },
          ],
          role: "user",
        },
      ])
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "ADVISOR_INVALID_REQUEST",
      message: "Use inline JPEG, PNG, or WebP data for preview images.",
    });
    expect(provider.fetch).not.toHaveBeenCalled();
  });

  it("passes an inline image through the endpoint without a public URL", async () => {
    const provider = createModel(createProviderStream("Đã nhận ảnh"));
    const app = createAdvisorPreviewApp({
      getModel: () => provider.model,
      isAuthorized: () => true,
    });

    const response = await app.request(
      request([
        {
          id: "message-1",
          parts: [
            { text: "Mô tả ảnh này", type: "text" },
            {
              filename: "sample.png",
              mediaType: "image/png",
              type: "file",
              url: SAMPLE_PNG_DATA_URL,
            },
          ],
          role: "user",
        },
      ])
    );

    await response.text();

    const init = provider.fetch.mock.calls[0]?.[1];
    if (typeof init?.body !== "string") {
      throw new TypeError("Expected the provider request body to be JSON");
    }

    const body = JSON.parse(init.body) as {
      messages: { content: unknown }[];
    };
    const content = body.messages.find((message) =>
      Array.isArray(message.content)
    )?.content;
    expect(content).toEqual([
      { text: "Mô tả ảnh này", type: "text" },
      {
        image_url: { url: SAMPLE_PNG_DATA_URL },
        type: "image_url",
      },
    ]);
    expect(JSON.stringify(content)).not.toContain("https://");
  });

  it("returns a typed unavailable response when no provider is configured", async () => {
    const app = createAdvisorPreviewApp({
      getModel: () => {},
      isAuthorized: () => true,
    });

    const response = await app.request(
      request([
        {
          id: "message-1",
          parts: [{ text: "Xin chào", type: "text" }],
          role: "user",
        },
      ])
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: "ADVISOR_UNAVAILABLE",
      message: "The Service Advisor preview is not configured.",
    });
  });

  it("returns a typed stream error without exposing provider details", async () => {
    const provider = createModel("data: malformed\n\n");
    const reportProviderError = vi.fn();
    const app = createAdvisorPreviewApp({
      getModel: () => provider.model,
      getProviderKeyFingerprint: () => "old-fingerprint",
      isAuthorized: () => true,
      reportProviderError,
    });

    const response = await app.request(
      request([
        {
          id: "message-1",
          parts: [{ text: "Xin chào", type: "text" }],
          role: "user",
        },
      ])
    );

    expect(response.status).toBe(200);
    const stream = await response.text();
    expect(stream).toContain("ADVISOR_STREAM_ERROR");
    expect(stream).not.toContain("malformed");
    expect(reportProviderError).toHaveBeenCalledWith("old-fingerprint");
  });

  it("normalizes provider HTTP errors without exposing provider details", async () => {
    const provider = createModel(
      JSON.stringify({ error: { message: "provider-secret" } }),
      429
    );
    const app = createAdvisorPreviewApp({
      getModel: () => provider.model,
      isAuthorized: () => true,
    });

    const response = await app.request(
      request([
        {
          id: "message-1",
          parts: [{ text: "Xin chào", type: "text" }],
          role: "user",
        },
      ])
    );

    expect(response.status).toBe(200);
    const stream = await response.text();
    expect(stream).toContain("ADVISOR_STREAM_ERROR");
    expect(stream).not.toContain("provider-secret");
  });
});
