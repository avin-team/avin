import { streamText } from "ai";

import {
  ADVISOR_MAX_OUTPUT_TOKENS,
  advisorProviderOptions,
  createAdvisorModel,
} from "./advisor-provider";

const apiKey = process.env.GROQ_API_KEY?.trim();
const samplePngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

if (!apiKey) {
  console.error(
    "Advisor live smoke skipped: set GROQ_API_KEY before running smoke:advisor."
  );
  process.exit(1);
}

const result = streamText({
  maxOutputTokens: ADVISOR_MAX_OUTPUT_TOKENS,
  messages: [
    {
      content: [
        {
          text: "Trả lời đúng một câu ngắn bằng tiếng Việt: ping preview.",
          type: "text",
        },
        { data: samplePngDataUrl, mediaType: "image/png", type: "file" },
      ],
      role: "user",
    },
  ],
  model: createAdvisorModel({ apiKey }),
  providerOptions: advisorProviderOptions,
});

try {
  const text = await result.text;
  if (!text.trim()) {
    throw new Error("Groq returned an empty response");
  }

  process.stdout.write("Advisor live smoke passed.\n");
} catch (error) {
  console.error(
    `Advisor live smoke failed: ${
      error instanceof Error ? error.message : "unknown provider error"
    }`
  );
  process.exitCode = 1;
}
