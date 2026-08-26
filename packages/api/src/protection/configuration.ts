import { env } from "@avin/env/server";

import type { ProtectionLaunchConfiguration } from "./launch-gates";

export const getProtectionLaunchConfiguration =
  (): ProtectionLaunchConfiguration => ({
    gates: {
      custody: env.AVIN_CHECK_CUSTODY_APPROVED,
      dataGovernance: env.AVIN_CHECK_DATA_GOVERNANCE_APPROVED,
      legalReview: env.AVIN_CHECK_LEGAL_REVIEW_APPROVED,
      programEntity: env.AVIN_CHECK_PROGRAM_ENTITY_APPROVED,
    },
    mode: env.AVIN_CHECK_MODE,
    readiness: {
      auditDualApproval: env.AVIN_CHECK_AUDIT_DUAL_APPROVAL_VALIDATED,
      bondReconciliation: env.AVIN_CHECK_BOND_RECONCILIATION_APPROVED,
      correctionRemoval: env.AVIN_CHECK_CORRECTION_REMOVAL_VALIDATED,
      pilotExitCriteria: env.AVIN_CHECK_PILOT_EXIT_CRITERIA_APPROVED,
      privacyProjection: env.AVIN_CHECK_PRIVACY_PROJECTIONS_APPROVED,
      slaMeasurement: env.AVIN_CHECK_SLA_MEASURABLE,
    },
    riskReportPublicationEnabled:
      env.AVIN_CHECK_RISK_REPORT_PUBLICATION_ENABLED,
  });
