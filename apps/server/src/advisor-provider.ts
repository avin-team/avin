import { createGroq } from "@ai-sdk/groq";
import type { GroqProviderSettings } from "@ai-sdk/groq";
import { ADVISOR_MODEL_ID } from "@avin/api/advisor/provider";
import type { LanguageModel } from "ai";

export { ADVISOR_MODEL_ID } from "@avin/api/advisor/provider";
export const ADVISOR_MAX_OUTPUT_TOKENS = 1024 as const;
export const ADVISOR_MODEL_TIMEOUT_MS = 30_000 as const;
export const ADVISOR_REASONING_EFFORT = "none" as const;

export type AdvisorProviderOptions = Record<string, Record<string, string>>;

export interface CreateAdvisorModelOptions {
  apiKey: string;
  baseURL?: string;
  fetch?: GroqProviderSettings["fetch"];
}

export type AdvisorProviderFetch = NonNullable<GroqProviderSettings["fetch"]>;

export const createAdvisorModel = ({
  apiKey,
  baseURL,
  fetch,
}: CreateAdvisorModelOptions): LanguageModel => {
  if (!apiKey.trim()) {
    throw new Error("A Groq API key is required to start the Service Advisor");
  }

  const provider = createGroq({
    apiKey,
    baseURL,
    fetch,
  });

  return provider.languageModel(ADVISOR_MODEL_ID);
};

export const advisorProviderOptions: AdvisorProviderOptions = {
  groq: {
    reasoningEffort: ADVISOR_REASONING_EFFORT,
  },
};
