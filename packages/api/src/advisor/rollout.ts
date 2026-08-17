export interface AdvisorRolloutSubject {
  userId?: string | null;
  visitorCapabilityHash?: string | null;
}

export interface AdvisorRolloutConfig {
  allowlist?: readonly string[];
  enabled?: boolean;
  percentage?: number;
  salt?: string;
}

export type AdvisorRolloutDecisionReason =
  | "ALLOWLIST"
  | "DISABLED"
  | "NO_SUBJECT"
  | "PERCENTAGE"
  | "OUTSIDE_PERCENTAGE";

export interface AdvisorRolloutDecision {
  bucket: number | null;
  enabled: boolean;
  reason: AdvisorRolloutDecisionReason;
}

export interface AdvisorRolloutStatus {
  allowlistSize: number;
  enabled: boolean;
  percentage: number;
}

export interface AdvisorRolloutGate {
  decide: (subject: AdvisorRolloutSubject) => AdvisorRolloutDecision;
  getStatus: () => AdvisorRolloutStatus;
  isEnabled: (subject: AdvisorRolloutSubject) => boolean;
}

const DEFAULT_PERCENTAGE = 10;
const DEFAULT_SALT = "avin-service-advisor-beta-v1";

const stableHash = (value: string): number => {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 4_294_967_291;
  }
  return hash;
};

const clampPercentage = (percentage: number): number =>
  Math.min(100, Math.max(0, Math.round(percentage)));

const getSubjectKey = ({
  userId,
  visitorCapabilityHash,
}: AdvisorRolloutSubject): string | null => {
  if (userId?.trim()) {
    return `user:${userId.trim()}`;
  }
  if (visitorCapabilityHash?.trim()) {
    return `visitor:${visitorCapabilityHash.trim()}`;
  }
  return null;
};

export const createAdvisorRolloutGate = ({
  allowlist = [],
  enabled = true,
  percentage = DEFAULT_PERCENTAGE,
  salt = DEFAULT_SALT,
}: AdvisorRolloutConfig = {}): AdvisorRolloutGate => {
  const normalizedPercentage = clampPercentage(percentage);
  const normalizedAllowlist = new Set(
    allowlist.flatMap((value) => {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    })
  );
  const status: AdvisorRolloutStatus = {
    allowlistSize: normalizedAllowlist.size,
    enabled,
    percentage: normalizedPercentage,
  };

  const decide = (subject: AdvisorRolloutSubject): AdvisorRolloutDecision => {
    if (!enabled) {
      return { bucket: null, enabled: false, reason: "DISABLED" };
    }

    const subjectKey = getSubjectKey(subject);
    if (!subjectKey) {
      return { bucket: null, enabled: false, reason: "NO_SUBJECT" };
    }

    if (
      normalizedAllowlist.has(subjectKey) ||
      normalizedAllowlist.has(subjectKey.slice(subjectKey.indexOf(":") + 1))
    ) {
      return { bucket: 0, enabled: true, reason: "ALLOWLIST" };
    }

    const bucket = stableHash(`${salt}:${subjectKey}`) % 100;
    return {
      bucket,
      enabled: bucket < normalizedPercentage,
      reason:
        bucket < normalizedPercentage ? "PERCENTAGE" : "OUTSIDE_PERCENTAGE",
    };
  };

  return {
    decide,
    getStatus: () => status,
    isEnabled: (subject) => decide(subject).enabled,
  };
};
