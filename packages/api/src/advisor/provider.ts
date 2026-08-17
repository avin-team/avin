import { z } from "zod";

export const ADVISOR_PROVIDER_ID = "groq" as const;
export const ADVISOR_MODEL_ID = "qwen/qwen3.6-27b" as const;

export const advisorProviderModelSchema = z.enum([ADVISOR_MODEL_ID]);

export const advisorProviderConfigInputSchema = z.strictObject({
  apiKey: z.string().trim().min(1).max(500),
  model: advisorProviderModelSchema,
});

export type AdvisorProviderConfigInput = z.infer<
  typeof advisorProviderConfigInputSchema
>;

export const advisorProviderStateSchema = z.enum([
  "ACTIVE",
  "DISABLED",
  "INVALID",
  "UNAVAILABLE",
]);

export type AdvisorProviderState = z.infer<typeof advisorProviderStateSchema>;

export interface AdvisorProviderStatus {
  configured: boolean;
  contractVerifiedAt: string | null;
  disabledAt: string | null;
  isPreview: boolean;
  isVisionCapable: boolean;
  keyLastFour: string | null;
  lastCheckedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  model: string | null;
  provider: typeof ADVISOR_PROVIDER_ID;
  state: AdvisorProviderState;
  zdrVerifiedAt: string | null;
}

export interface AdvisorProviderTestResult {
  contractVerified: boolean;
  message: string;
  model: typeof ADVISOR_MODEL_ID;
  provider: typeof ADVISOR_PROVIDER_ID;
}

export interface AdvisorProviderManager {
  activateConfiguration: (
    input: AdvisorProviderConfigInput
  ) => Promise<AdvisorProviderStatus>;
  disableConfiguration: () => Promise<AdvisorProviderStatus>;
  getStatus: () => Promise<AdvisorProviderStatus>;
  markUnavailable: (keyFingerprint?: string) => Promise<AdvisorProviderStatus>;
  testConfiguration: (
    input: AdvisorProviderConfigInput
  ) => Promise<AdvisorProviderTestResult>;
}
