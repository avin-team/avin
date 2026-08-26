export const PROTECTION_MODULE_NAME = "Avin Check" as const;
export const PROTECTION_MANAGEMENT_CONTACT = "admin@avin.vn" as const;
export const PROTECTION_PARTICIPANT_LABEL = "Đối tác Avin" as const;
export const PROTECTION_OPERATOR_LABEL = "Quản lý hệ thống" as const;

export const protectionLaunchGateNames = [
  "legalReview",
  "dataGovernance",
  "programEntity",
  "custody",
] as const;

export type ProtectionLaunchGateName =
  (typeof protectionLaunchGateNames)[number];

export const protectionReadinessGateNames = [
  "bondReconciliation",
  "privacyProjection",
  "slaMeasurement",
  "correctionRemoval",
  "auditDualApproval",
  "pilotExitCriteria",
] as const;

export type ProtectionReadinessGateName =
  (typeof protectionReadinessGateNames)[number];

export type ProtectionLaunchMode = "NO_MONEY_PILOT" | "LIVE";

export type ProtectionOperation =
  | "RISK_REPORT_PUBLICATION"
  | "PROVIDER_BOND_RECOGNITION";

export type ProtectionLaunchBlocker =
  | "CUSTODY_APPROVAL"
  | "DATA_GOVERNANCE_REVIEW"
  | "LEGAL_REVIEW"
  | "NO_MONEY_PILOT"
  | "PROGRAM_ENTITY_APPROVAL"
  | "RISK_REPORT_PUBLICATION_DISABLED";

export type ProtectionReadinessBlocker =
  | "AUDIT_DUAL_APPROVAL_NOT_VALIDATED"
  | "BOND_RECONCILIATION_INCOMPLETE"
  | "CORRECTION_REMOVAL_NOT_VALIDATED"
  | "PILOT_EXIT_CRITERIA_NOT_APPROVED"
  | "PRIVACY_PROJECTION_REVIEW"
  | "SLA_MEASUREMENT_NOT_VALIDATED";

export interface ProtectionLaunchConfiguration {
  gates: Record<ProtectionLaunchGateName, boolean>;
  mode: ProtectionLaunchMode;
  riskReportPublicationEnabled: boolean;
  readiness?: Record<ProtectionReadinessGateName, boolean>;
}

export interface ProtectionOperationStatus {
  blockers: ProtectionLaunchBlocker[];
  enabled: boolean;
}

export interface ProtectionReadinessStatus {
  blockers: ProtectionReadinessBlocker[];
  enabled: boolean;
  gates: Record<ProtectionReadinessGateName, boolean>;
}

export interface ProtectionLaunchStatus {
  gates: Record<ProtectionLaunchGateName, boolean>;
  mode: ProtectionLaunchMode;
  pilot: {
    enabled: boolean;
    realMoneyDisabled: boolean;
  };
  readiness: ProtectionReadinessStatus;
  providerBondRecognition: ProtectionOperationStatus;
  riskReportPublication: ProtectionOperationStatus;
}

export const defaultProtectionLaunchConfiguration: ProtectionLaunchConfiguration =
  {
    gates: {
      custody: false,
      dataGovernance: false,
      legalReview: false,
      programEntity: false,
    },
    mode: "NO_MONEY_PILOT",
    readiness: {
      auditDualApproval: false,
      bondReconciliation: false,
      correctionRemoval: false,
      pilotExitCriteria: false,
      privacyProjection: false,
      slaMeasurement: false,
    },
    riskReportPublicationEnabled: false,
  };

const blockerByGate: Record<ProtectionLaunchGateName, ProtectionLaunchBlocker> =
  {
    custody: "CUSTODY_APPROVAL",
    dataGovernance: "DATA_GOVERNANCE_REVIEW",
    legalReview: "LEGAL_REVIEW",
    programEntity: "PROGRAM_ENTITY_APPROVAL",
  };

const blockerByReadinessGate: Record<
  ProtectionReadinessGateName,
  ProtectionReadinessBlocker
> = {
  auditDualApproval: "AUDIT_DUAL_APPROVAL_NOT_VALIDATED",
  bondReconciliation: "BOND_RECONCILIATION_INCOMPLETE",
  correctionRemoval: "CORRECTION_REMOVAL_NOT_VALIDATED",
  pilotExitCriteria: "PILOT_EXIT_CRITERIA_NOT_APPROVED",
  privacyProjection: "PRIVACY_PROJECTION_REVIEW",
  slaMeasurement: "SLA_MEASUREMENT_NOT_VALIDATED",
};

const getGateBlockers = (
  configuration: ProtectionLaunchConfiguration
): ProtectionLaunchBlocker[] => {
  const blockers: ProtectionLaunchBlocker[] = [];

  for (const gateName of protectionLaunchGateNames) {
    if (!configuration.gates[gateName]) {
      blockers.push(blockerByGate[gateName]);
    }
  }

  return blockers;
};

const createOperationStatus = (
  blockers: ProtectionLaunchBlocker[]
): ProtectionOperationStatus => ({
  blockers,
  enabled: blockers.length === 0,
});

export const getProtectionReadinessStatus = (
  configuration: ProtectionLaunchConfiguration
): ProtectionReadinessStatus => {
  const gates = {} as Record<ProtectionReadinessGateName, boolean>;
  const blockers: ProtectionReadinessBlocker[] = [];

  for (const gateName of protectionReadinessGateNames) {
    const enabled = configuration.readiness?.[gateName] ?? false;
    gates[gateName] = enabled;
    if (!enabled) {
      blockers.push(blockerByReadinessGate[gateName]);
    }
  }

  return {
    blockers,
    enabled: blockers.length === 0,
    gates,
  };
};

export const getProtectionLaunchStatus = (
  configuration: ProtectionLaunchConfiguration
): ProtectionLaunchStatus => {
  const gateBlockers = getGateBlockers(configuration);
  const riskReportPublicationBlockers = [...gateBlockers];
  const bondBlockers = [...gateBlockers];

  if (!configuration.riskReportPublicationEnabled) {
    riskReportPublicationBlockers.push("RISK_REPORT_PUBLICATION_DISABLED");
  }

  if (configuration.mode === "NO_MONEY_PILOT") {
    bondBlockers.push("NO_MONEY_PILOT");
  }

  return {
    gates: { ...configuration.gates },
    mode: configuration.mode,
    pilot: {
      enabled: configuration.mode === "NO_MONEY_PILOT",
      realMoneyDisabled: configuration.mode !== "LIVE",
    },
    providerBondRecognition: createOperationStatus(bondBlockers),
    readiness: getProtectionReadinessStatus(configuration),
    riskReportPublication: createOperationStatus(riskReportPublicationBlockers),
  };
};

export const isProtectionOperationAllowed = (
  configuration: ProtectionLaunchConfiguration,
  operation: ProtectionOperation
): boolean => {
  const status = getProtectionLaunchStatus(configuration);
  return status[
    operation === "RISK_REPORT_PUBLICATION"
      ? "riskReportPublication"
      : "providerBondRecognition"
  ].enabled;
};

export class ProtectionLaunchGateError extends Error {
  readonly code = "PROTECTION_LAUNCH_GATE_BLOCKED" as const;
  readonly operation: ProtectionOperation;
  readonly blockers: ProtectionLaunchBlocker[];

  constructor(
    operation: ProtectionOperation,
    blockers: ProtectionLaunchBlocker[]
  ) {
    super(
      `${operation} is disabled until these Avin Check launch gates are satisfied: ${blockers.join(", ")}`
    );
    this.operation = operation;
    this.blockers = blockers;
    this.name = "ProtectionLaunchGateError";
  }
}

export const assertProtectionOperationAllowed = (
  configuration: ProtectionLaunchConfiguration,
  operation: ProtectionOperation
): void => {
  const status = getProtectionLaunchStatus(configuration);
  const operationStatus =
    operation === "RISK_REPORT_PUBLICATION"
      ? status.riskReportPublication
      : status.providerBondRecognition;

  if (!operationStatus.enabled) {
    throw new ProtectionLaunchGateError(operation, operationStatus.blockers);
  }
};
