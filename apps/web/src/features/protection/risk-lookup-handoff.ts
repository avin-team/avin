export const riskLookupKinds = [
  "AUTO",
  "PHONE_OR_BANK",
  "PHONE",
  "BANK_ACCOUNT",
  "WEBSITE",
  "FACEBOOK",
  "TIKTOK",
  "TELEGRAM",
] as const;

export type RiskLookupKind = (typeof riskLookupKinds)[number];

export interface RiskLookupHandoff {
  kind: RiskLookupKind;
  value: string;
}

const RISK_LOOKUP_HANDOFF_STORAGE_KEY = "avin:risk-lookup-handoff";
const RISK_LOOKUP_HANDOFF_TTL_MS = 5 * 60 * 1000;

interface RememberedRiskLookupHandoff {
  expiresAt: number;
  handoff: RiskLookupHandoff;
}

let fallbackRiskLookupHandoff: RememberedRiskLookupHandoff | null = null;

const isRiskLookupKind = (value: unknown): value is RiskLookupKind =>
  typeof value === "string" &&
  (riskLookupKinds as readonly string[]).includes(value);

export const getRiskLookupHandoff = (
  state: unknown
): RiskLookupHandoff | null => {
  if (typeof state !== "object" || state === null) {
    return null;
  }

  const handoff = (state as { riskLookup?: unknown }).riskLookup;
  if (typeof handoff !== "object" || handoff === null) {
    return null;
  }

  const candidate = handoff as { kind?: unknown; value?: unknown };
  if (
    !isRiskLookupKind(candidate.kind) ||
    typeof candidate.value !== "string" ||
    candidate.value.trim().length < 4
  ) {
    return null;
  }

  return {
    kind: candidate.kind,
    value: candidate.value,
  };
};

export const rememberRiskLookupHandoff = (handoff: RiskLookupHandoff): void => {
  const rememberedHandoff: RememberedRiskLookupHandoff = {
    expiresAt: Date.now() + RISK_LOOKUP_HANDOFF_TTL_MS,
    handoff,
  };
  if (typeof window === "undefined") {
    fallbackRiskLookupHandoff = rememberedHandoff;
    return;
  }

  try {
    window.sessionStorage.setItem(
      RISK_LOOKUP_HANDOFF_STORAGE_KEY,
      JSON.stringify(rememberedHandoff)
    );
    fallbackRiskLookupHandoff = rememberedHandoff;
  } catch {
    fallbackRiskLookupHandoff = rememberedHandoff;
  }
};

const consumeRememberedRiskLookupHandoff = (
  rememberedHandoff: unknown
): RiskLookupHandoff | null => {
  if (typeof rememberedHandoff !== "object" || rememberedHandoff === null) {
    return null;
  }

  const candidate = rememberedHandoff as Partial<RememberedRiskLookupHandoff>;
  if (
    typeof candidate.expiresAt !== "number" ||
    candidate.expiresAt <= Date.now()
  ) {
    return null;
  }

  return getRiskLookupHandoff({ riskLookup: candidate.handoff });
};

export const takeRememberedRiskLookupHandoff = (): RiskLookupHandoff | null => {
  if (typeof window === "undefined") {
    const handoff = consumeRememberedRiskLookupHandoff(
      fallbackRiskLookupHandoff
    );
    fallbackRiskLookupHandoff = null;
    return handoff;
  }

  try {
    const rawHandoff = window.sessionStorage.getItem(
      RISK_LOOKUP_HANDOFF_STORAGE_KEY
    );
    window.sessionStorage.removeItem(RISK_LOOKUP_HANDOFF_STORAGE_KEY);
    const handoff = rawHandoff
      ? consumeRememberedRiskLookupHandoff(JSON.parse(rawHandoff))
      : null;
    fallbackRiskLookupHandoff = null;
    return handoff;
  } catch {
    const handoff = consumeRememberedRiskLookupHandoff(
      fallbackRiskLookupHandoff
    );
    fallbackRiskLookupHandoff = null;
    return handoff;
  }
};
