import type { ProtectionLaunchConfiguration } from "./launch-gates";

export const getProtectionLaunchConfiguration =
  (): ProtectionLaunchConfiguration => ({
    gates: {
      custody: true,
      dataGovernance: true,
      legalReview: true,
      programEntity: true,
    },
    mode: "LIVE",
    readiness: {
      auditDualApproval: true,
      bondReconciliation: true,
      correctionRemoval: true,
      pilotExitCriteria: true,
      privacyProjection: true,
      slaMeasurement: true,
    },
    riskReportPublicationEnabled: true,
  });
