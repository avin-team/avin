import { PROTECTION_ADMIN_CAPABILITY } from "@avin/auth/permissions";
import { z } from "zod";

import {
  providerProcedure,
  providerSensitiveProcedure,
  publicProcedure,
} from "../access/procedures";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  MAX_NOTIFICATION_PAGE_SIZE,
} from "../notifications/inbox";
import {
  providerBondAdjustmentApprovalInputSchema,
  providerBondAdjustmentRecordInputSchema,
  providerBondLimitInputSchema,
  providerBondProfileIdInputSchema,
} from "./bond";
import {
  approveProviderBondAdjustment,
  getProviderBondForAdmin,
  getProviderBondForProvider,
  listProviderBondsForAdmin,
  publishProviderRecommendedTransactionLimit,
  recordProviderBondAdjustment,
} from "./bond-service";
import {
  providerBondWithdrawalApprovalInputSchema,
  providerBondWithdrawalIdInputSchema,
  providerBondWithdrawalListInputSchema,
  providerBondWithdrawalRecordInputSchema,
  providerBondWithdrawalRequestInputSchema,
} from "./bond-withdrawal";
import {
  approveProviderBondWithdrawal,
  getAdminProviderBondWithdrawal,
  getProviderBondWithdrawal,
  listAdminProviderBondWithdrawals,
  recordProviderBondWithdrawal,
  requestProviderBondWithdrawal,
} from "./bond-withdrawal-service";
import { getProtectionLaunchConfiguration } from "./configuration";
import {
  exportProtectionOperations,
  protectionOperationsExportInputSchema,
} from "./export";
import {
  PROTECTION_MODULE_NAME,
  getProtectionLaunchStatus,
} from "./launch-gates";
import { listProtectionOperationsQueue } from "./operations";
import {
  getProtectionPilotConfiguration,
  inviteProtectionPilotProvider,
  listProtectionPilotInvitations,
  protectionPilotConfigurationInputSchema,
  protectionPilotInvitationInputSchema,
  updateProtectionPilotConfiguration,
} from "./pilot";
import {
  protectionPolicyVersionIdInputSchema,
  protectionPolicyVersionListInputSchema,
  protectionPolicyVersionPublishInputSchema,
} from "./policy";
import {
  acceptCurrentProtectionPolicy,
  getAdminProtectionPolicyVersion,
  getProviderProtectionPolicy,
  getPublicCurrentProtectionPolicy,
  listAdminProtectionPolicyVersions,
  publishProtectionPolicyVersion,
} from "./policy-service";
import { protectionAdminProcedure } from "./procedures";
import {
  providerApplicationDecisionInputSchema,
  providerApplicationDraftInputSchema,
  providerApplicationIdInputSchema,
  providerApplicationListInputSchema,
  providerApplicationSubmissionInputSchema,
  providerProfileRevisionDecisionInputSchema,
  providerProfileRevisionIdInputSchema,
  providerProfileRevisionListInputSchema,
  providerProfileRevisionDraftInputSchema,
  providerProfileRevisionSubmissionInputSchema,
  providerProfileStatusInputSchema,
  providerOwnershipRelinkInputSchema,
} from "./provider-application";
import {
  decideProviderProfileRevision,
  decideProviderApplication,
  getProviderApplicationForAdmin,
  getProviderApplicationSnapshot,
  getProviderProfileRevisionForAdmin,
  getPublicProviderProfile,
  listProviderProfileRevisions,
  listProviderApplications,
  publishProviderProfileStatus,
  relinkProviderOwnership,
  saveProviderApplicationDraft,
  saveProviderProfileRevisionDraft,
  startProviderProfileRevision,
  submitProviderApplication,
  submitProviderProfileRevision,
} from "./provider-application-service";
import {
  providerDepositIntentAdminListInputSchema,
  providerDepositIntentCreateInputSchema,
  providerDepositIntentManualDecisionInputSchema,
} from "./provider-deposit-intent";
import {
  createProviderApplicationDepositIntent,
  createProviderBondTopUpIntent,
  decideProviderDepositIntentManually,
  getProviderDepositIntent,
  listProviderDepositIntentsForAdmin,
} from "./provider-deposit-intent-service";
import {
  listProviderDirectory,
  providerDirectoryListInputSchema,
  providerDirectorySearchInputSchema,
  searchProviderDirectory,
} from "./provider-directory";
import {
  providerRiskIncidentCandidateListInputSchema,
  providerRiskIncidentConfirmFraudInputSchema,
  providerRiskIncidentEvidenceInputSchema,
  providerRiskIncidentIdInputSchema,
  providerRiskIncidentLinkInputSchema,
  providerRiskIncidentListInputSchema,
  providerRiskIncidentResponseInputSchema,
  providerRiskIncidentReviewInputSchema,
} from "./provider-risk-incident";
import {
  confirmProviderRiskIncidentFraud,
  expireProviderRiskIncidentResponses,
  getProviderRiskIncidentForAdmin,
  linkRiskReportToProvider,
  listProviderRiskIncidentCandidates,
  listProviderRiskIncidentsForAdmin,
  listProviderRiskIncidentsForProvider,
  registerProviderRiskIncidentEvidence,
  reviewProviderRiskIncident,
  submitProviderRiskIncidentResponse,
} from "./provider-risk-incident-service";
import {
  getPublicRiskStatistics,
  publicRiskIdentifierLookupInputSchema,
  searchPublicRiskIdentifiers,
} from "./risk-lookup";
import {
  publicRiskWarningIdInputSchema,
  publicRiskWarningListInputSchema,
  riskReportAdminDecisionInputSchema,
  riskReportAdminIdInputSchema,
  riskReportAdminListInputSchema,
  riskReportCorrectionDecisionInputSchema,
  riskReportCorrectionRequestInputSchema,
  riskReportDerivativeInputSchema,
  riskReportDraftInputSchema,
  riskReportEvidenceInputSchema,
  riskReportMineInputSchema,
  riskReportOwnedInputSchema,
  riskReportWithdrawalInputSchema,
} from "./risk-report";
import {
  addRiskReportEvidence,
  createRiskReportOriginalEvidenceUrl,
  decideRiskReportCorrection,
  decideRiskReport,
  deleteRiskReportDraft,
  getPublicRiskWarning,
  getRiskReportForAdmin,
  getRiskReportMine,
  listRiskReportCorrectionsForAdmin,
  listRiskReportCorrectionsForRequester,
  listPublicRiskWarnings,
  listRiskReportsForAdmin,
  registerRiskReportDerivative,
  requestRiskReportCorrection,
  requestRiskReportWithdrawal,
  saveRiskReportDraft,
  submitRiskReport,
} from "./risk-report-service";
import {
  supportReviewDecisionInputSchema,
  supportReviewEligibilityInputSchema,
  supportReviewIdInputSchema,
  supportReviewListInputSchema,
  supportReviewOutcomeInputSchema,
  supportReviewReconsiderInputSchema,
  supportReviewStartInputSchema,
} from "./support-review";
import {
  approveSupportReview,
  evaluateSupportReview,
  getAdminSupportReview,
  listSupportReviewsForAdmin,
  reconsiderSupportReview,
  recordSupportReviewOutcome,
  startSupportReview,
} from "./support-review-service";

const providerNotificationListInput = z
  .object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(MAX_NOTIFICATION_PAGE_SIZE).optional(),
    unreadOnly: z.boolean().optional(),
  })
  .optional();

const providerNotificationIdInput = z.object({ notificationId: z.uuid() });

const providerReviewerProcedure = protectionAdminProcedure({
  action: "protection.provider_application.review",
  capability: PROTECTION_ADMIN_CAPABILITY.PROVIDER_REVIEWER,
  purpose: "Review Provider applications and publish approved profiles",
  target: {
    id: "PROTECTION_PROVIDER_APPLICATION_QUEUE",
    type: "PROTECTION_PROVIDER_APPLICATION_QUEUE",
  },
});

const providerDepositIntentAdminProcedure = protectionAdminProcedure({
  action: "protection.provider_deposit_intent.reconcile",
  capability: PROTECTION_ADMIN_CAPABILITY.SUPER_ADMIN,
  purpose: "Manually reconcile or refund Provider deposit intents",
  target: {
    id: "PROTECTION_PROVIDER_DEPOSIT_INTENT_QUEUE",
    type: "PROTECTION_PROVIDER_DEPOSIT_INTENT_QUEUE",
  },
});

const providerPolicyReadProcedure = protectionAdminProcedure({
  action: "protection.provider_policy.read",
  capability: [
    PROTECTION_ADMIN_CAPABILITY.PROVIDER_REVIEWER,
    PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
  ],
  purpose: "Review immutable Avin Check Provider policy versions",
  target: {
    id: "PROTECTION_PROVIDER_POLICY_QUEUE",
    type: "PROTECTION_PROVIDER_POLICY_QUEUE",
  },
});

const providerPolicyPublishProcedure = protectionAdminProcedure({
  action: "protection.provider_policy.publish",
  capability: PROTECTION_ADMIN_CAPABILITY.SUPER_ADMIN,
  purpose: "Publish immutable Avin Check Provider policy versions",
  target: {
    id: "PROTECTION_PROVIDER_POLICY_QUEUE",
    type: "PROTECTION_PROVIDER_POLICY_QUEUE",
  },
});

const protectionOperationsReadProcedure = protectionAdminProcedure({
  action: "protection.operations.queue.read",
  capability: [
    PROTECTION_ADMIN_CAPABILITY.BOND_OPERATOR,
    PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
    PROTECTION_ADMIN_CAPABILITY.PROVIDER_REVIEWER,
    PROTECTION_ADMIN_CAPABILITY.RISK_MODERATOR,
  ],
  purpose: "Review Avin Check operational queues and SLA status",
  target: {
    id: "PROTECTION_OPERATIONS_QUEUE",
    type: "PROTECTION_OPERATIONS_QUEUE",
  },
});

const protectionOperationsExportProcedure = protectionAdminProcedure({
  action: "protection.operations.export",
  capability: PROTECTION_ADMIN_CAPABILITY.PROTECTION_EXPORTER,
  purpose: "Create controlled Avin Check operational exports",
  target: {
    id: "PROTECTION_OPERATIONS_EXPORT",
    type: "PROTECTION_OPERATIONS_EXPORT",
  },
});

const protectionPilotReadProcedure = protectionAdminProcedure({
  action: "protection.pilot.read",
  capability: PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
  purpose: "Review invitation-limited Avin Check pilot configuration",
  target: {
    id: "PROTECTION_PILOT",
    type: "PROTECTION_PILOT",
  },
});

const protectionPilotManageProcedure = protectionAdminProcedure({
  action: "protection.pilot.manage",
  capability: PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
  purpose: "Manage invitation-limited Avin Check pilot approvals",
  target: {
    id: "PROTECTION_PILOT",
    type: "PROTECTION_PILOT",
  },
});

const providerProfileRevisionReviewerProcedure = protectionAdminProcedure({
  action: "protection.provider_profile_revision.review",
  capability: PROTECTION_ADMIN_CAPABILITY.PROVIDER_REVIEWER,
  purpose: "Review Provider profile revisions and publish immutable versions",
  target: {
    id: "PROTECTION_PROVIDER_PROFILE_REVISION_QUEUE",
    type: "PROTECTION_PROVIDER_PROFILE_REVISION_QUEUE",
  },
});

const providerOwnershipManagerProcedure = protectionAdminProcedure({
  action: "protection.provider_ownership.relink",
  capability: PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
  purpose: "Relink a Provider standing to a proven Buyer or Seller account",
  target: {
    id: "PROTECTION_PROVIDER_OWNERSHIP",
    type: "PROTECTION_PROVIDER_OWNERSHIP",
  },
});

const riskModeratorProcedure = protectionAdminProcedure({
  action: "protection.risk_report.review",
  capability: PROTECTION_ADMIN_CAPABILITY.RISK_MODERATOR,
  purpose:
    "Review private Avin Check risk reports and publish redacted warnings",
  target: {
    id: "PROTECTION_RISK_REPORT_QUEUE",
    type: "PROTECTION_RISK_REPORT_QUEUE",
  },
});

const riskCorrectionModeratorProcedure = protectionAdminProcedure({
  action: "protection.risk_correction.review",
  capability: PROTECTION_ADMIN_CAPABILITY.RISK_MODERATOR,
  purpose: "Review private Avin Check Risk Report correction requests",
  target: {
    id: "PROTECTION_RISK_CORRECTION_QUEUE",
    type: "PROTECTION_RISK_CORRECTION_QUEUE",
  },
});

const providerRiskIncidentModeratorProcedure = protectionAdminProcedure({
  action: "protection.provider_risk_incident.review",
  capability: PROTECTION_ADMIN_CAPABILITY.RISK_MODERATOR,
  purpose:
    "Associate Provider-linked Risk Reports and review private Provider responses",
  target: {
    id: "PROTECTION_PROVIDER_RISK_INCIDENT_QUEUE",
    type: "PROTECTION_PROVIDER_RISK_INCIDENT_QUEUE",
  },
});

const providerRiskIncidentManagerProcedure = protectionAdminProcedure({
  action: "protection.provider_risk_incident.enforce",
  capability: PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
  purpose: "Apply confirmed Provider fraud enforcement and SLA suspension",
  target: {
    id: "PROTECTION_PROVIDER_RISK_INCIDENT_QUEUE",
    type: "PROTECTION_PROVIDER_RISK_INCIDENT_QUEUE",
  },
});

const providerBondOperatorProcedure = protectionAdminProcedure({
  action: "protection.provider_bond.operate",
  capability: PROTECTION_ADMIN_CAPABILITY.SUPER_ADMIN,
  purpose: "Record reconciled Provider Bond adjustments",
  target: {
    id: "PROTECTION_PROVIDER_BOND_QUEUE",
    type: "PROTECTION_PROVIDER_BOND_QUEUE",
  },
});

const providerBondManagerProcedure = protectionAdminProcedure({
  action: "protection.provider_bond.approve",
  capability: PROTECTION_ADMIN_CAPABILITY.SUPER_ADMIN,
  purpose: "Approve Provider Bond decreases and publish supported limits",
  target: {
    id: "PROTECTION_PROVIDER_BOND_QUEUE",
    type: "PROTECTION_PROVIDER_BOND_QUEUE",
  },
});

const providerBondWithdrawalReadProcedure = protectionAdminProcedure({
  action: "protection.provider_bond_withdrawal.read",
  capability: [
    PROTECTION_ADMIN_CAPABILITY.BOND_OPERATOR,
    PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
  ],
  purpose: "Review private Provider Bond Withdrawal requests",
  target: {
    id: "PROTECTION_PROVIDER_BOND_WITHDRAWAL_QUEUE",
    type: "PROTECTION_PROVIDER_BOND_WITHDRAWAL_QUEUE",
  },
});

const providerBondWithdrawalOperatorProcedure = protectionAdminProcedure({
  action: "protection.provider_bond_withdrawal.record",
  capability: PROTECTION_ADMIN_CAPABILITY.SUPER_ADMIN,
  purpose: "Record off-platform Provider Bond Withdrawal actions",
  target: {
    id: "PROTECTION_PROVIDER_BOND_WITHDRAWAL_QUEUE",
    type: "PROTECTION_PROVIDER_BOND_WITHDRAWAL_QUEUE",
  },
});

const providerBondWithdrawalManagerProcedure = protectionAdminProcedure({
  action: "protection.provider_bond_withdrawal.approve",
  capability: PROTECTION_ADMIN_CAPABILITY.SUPER_ADMIN,
  purpose: "Approve Provider Bond Withdrawals",
  target: {
    id: "PROTECTION_PROVIDER_BOND_WITHDRAWAL_QUEUE",
    type: "PROTECTION_PROVIDER_BOND_WITHDRAWAL_QUEUE",
  },
});

const supportReviewReadProcedure = protectionAdminProcedure({
  action: "protection.support_review.read",
  capability: [
    PROTECTION_ADMIN_CAPABILITY.RISK_MODERATOR,
    PROTECTION_ADMIN_CAPABILITY.BOND_OPERATOR,
    PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
  ],
  purpose: "Read private Support Review records and outcomes",
  target: {
    id: "PROTECTION_SUPPORT_REVIEW_QUEUE",
    type: "PROTECTION_SUPPORT_REVIEW_QUEUE",
  },
});

const supportReviewModeratorProcedure = protectionAdminProcedure({
  action: "protection.support_review.moderate",
  capability: PROTECTION_ADMIN_CAPABILITY.RISK_MODERATOR,
  purpose: "Evaluate eligible direct Provider-linked support cases",
  target: {
    id: "PROTECTION_SUPPORT_REVIEW_QUEUE",
    type: "PROTECTION_SUPPORT_REVIEW_QUEUE",
  },
});

const supportReviewOperatorProcedure = protectionAdminProcedure({
  action: "protection.support_review.record_outcome",
  capability: PROTECTION_ADMIN_CAPABILITY.SUPER_ADMIN,
  purpose:
    "Record and complete off-platform support outcome and Bond allocation",
  target: {
    id: "PROTECTION_SUPPORT_REVIEW_QUEUE",
    type: "PROTECTION_SUPPORT_REVIEW_QUEUE",
  },
});

const supportReviewManagerProcedure = protectionAdminProcedure({
  action: "protection.support_review.approve",
  capability: PROTECTION_ADMIN_CAPABILITY.SUPER_ADMIN,
  purpose: "Approve Support Review outcomes as SUPER_ADMIN",
  target: {
    id: "PROTECTION_SUPPORT_REVIEW_QUEUE",
    type: "PROTECTION_SUPPORT_REVIEW_QUEUE",
  },
});

export const protectionRouter = {
  adminLaunchStatus: protectionAdminProcedure({
    action: "protection.launch_status.read",
    capability: PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
    purpose: "Review Avin Check launch gates before protected operations",
    target: { id: PROTECTION_MODULE_NAME, type: "PROTECTION_MODULE" },
  }).handler(() =>
    getProtectionLaunchStatus(getProtectionLaunchConfiguration())
  ),

  adminOperationsExport: protectionOperationsExportProcedure
    .input(protectionOperationsExportInputSchema)
    .handler(async ({ context, input }) => {
      const now = new Date();
      const auditEvent = {
        action: "protection.operations.export",
        actorUserId: context.session.user.id,
        createdAt: now,
        ipAddress: context.session.session.ipAddress ?? undefined,
        outcome: "FAILURE" as const,
        purpose: input.purpose,
        sessionId: context.session.session.id,
        targetId: input.dataset,
        targetType: "PROTECTION_OPERATIONS_EXPORT",
      };

      try {
        const result = await exportProtectionOperations({
          actorUserId: context.session.user.id,
          database: context.db,
          input,
          now,
        });
        await context.audit.record({
          ...auditEvent,
          metadata: {
            disclosureFields: result.fields,
            rowCount: result.rowCount,
            watermark: result.watermark,
          },
          outcome: "SUCCESS",
        });
        return result;
      } catch (error) {
        await context.audit.record(auditEvent);
        throw error;
      }
    }),

  adminOperationsQueue: protectionOperationsReadProcedure.handler(
    ({ context }) => listProtectionOperationsQueue({ database: context.db })
  ),

  adminPilot: {
    get: protectionPilotReadProcedure.handler(({ context }) =>
      getProtectionPilotConfiguration(context.db)
    ),

    invitations: protectionPilotReadProcedure.handler(({ context }) =>
      listProtectionPilotInvitations(context.db)
    ),

    invite: protectionPilotManageProcedure
      .input(protectionPilotInvitationInputSchema)
      .handler(({ context, input }) =>
        inviteProtectionPilotProvider({
          database: context.db,
          input,
          invitedByUserId: context.session.user.id,
        })
      ),

    update: protectionPilotManageProcedure
      .input(protectionPilotConfigurationInputSchema)
      .handler(({ context, input }) =>
        updateProtectionPilotConfiguration({
          database: context.db,
          input,
          updatedByUserId: context.session.user.id,
        })
      ),
  },

  adminProviderApplications: {
    decide: providerReviewerProcedure
      .input(providerApplicationDecisionInputSchema)
      .handler(({ context, input }) =>
        decideProviderApplication({
          applicationId: input.id,
          database: context.db,
          decision: input.decision,
          reason: input.reason,
          reviewerUserId: context.session.user.id,
        })
      ),

    get: providerReviewerProcedure
      .input(providerApplicationIdInputSchema)
      .handler(({ context, input }) =>
        getProviderApplicationForAdmin(context.db, input.id)
      ),

    list: providerReviewerProcedure
      .input(providerApplicationListInputSchema)
      .handler(({ context, input }) =>
        listProviderApplications(context.db, input)
      ),
  },

  adminProviderBondWithdrawals: {
    approve: providerBondWithdrawalManagerProcedure
      .input(providerBondWithdrawalApprovalInputSchema)
      .handler(({ context, input }) =>
        approveProviderBondWithdrawal({
          approverUserId: context.session.user.id,
          database: context.db,
          input,
        })
      ),

    get: providerBondWithdrawalReadProcedure
      .input(providerBondWithdrawalIdInputSchema)
      .handler(({ context, input }) =>
        getAdminProviderBondWithdrawal(context.db, input.withdrawalId)
      ),

    list: providerBondWithdrawalReadProcedure
      .input(providerBondWithdrawalListInputSchema)
      .handler(({ context, input }) =>
        listAdminProviderBondWithdrawals(context.db, input)
      ),

    record: providerBondWithdrawalOperatorProcedure
      .input(providerBondWithdrawalRecordInputSchema)
      .handler(({ context, input }) =>
        recordProviderBondWithdrawal({
          completeImmediately: true,
          database: context.db,
          input,
          recorderUserId: context.session.user.id,
        })
      ),
  },

  adminProviderBonds: {
    approve: providerBondManagerProcedure
      .input(providerBondAdjustmentApprovalInputSchema)
      .handler(({ context, input }) =>
        approveProviderBondAdjustment({
          database: context.db,
          input,
          reviewerUserId: context.session.user.id,
        })
      ),

    get: providerBondOperatorProcedure
      .input(providerBondProfileIdInputSchema)
      .handler(({ context, input }) =>
        getProviderBondForAdmin(context.db, input.profileId)
      ),

    list: providerBondOperatorProcedure.handler(({ context }) =>
      listProviderBondsForAdmin(context.db)
    ),

    publishLimit: providerBondManagerProcedure
      .input(providerBondLimitInputSchema)
      .handler(({ context, input }) =>
        publishProviderRecommendedTransactionLimit({
          database: context.db,
          input,
          publisherUserId: context.session.user.id,
        })
      ),

    record: providerBondOperatorProcedure
      .input(providerBondAdjustmentRecordInputSchema)
      .handler(({ context, input }) =>
        recordProviderBondAdjustment({
          applyImmediately: true,
          database: context.db,
          input,
          recordedByUserId: context.session.user.id,
        })
      ),
  },

  adminProviderPolicies: {
    get: providerPolicyReadProcedure
      .input(protectionPolicyVersionIdInputSchema)
      .handler(({ context, input }) =>
        getAdminProtectionPolicyVersion(context.db, input.policyVersionId)
      ),

    list: providerPolicyReadProcedure
      .input(protectionPolicyVersionListInputSchema)
      .handler(({ context, input }) =>
        listAdminProtectionPolicyVersions(context.db, input)
      ),

    publish: providerPolicyPublishProcedure
      .input(protectionPolicyVersionPublishInputSchema)
      .handler(({ context, input }) =>
        publishProtectionPolicyVersion({
          database: context.db,
          input,
          publisherUserId: context.session.user.id,
        })
      ),
  },

  adminProviderProfileRevisions: {
    decide: providerProfileRevisionReviewerProcedure
      .input(providerProfileRevisionDecisionInputSchema)
      .handler(({ context, input }) =>
        decideProviderProfileRevision({
          database: context.db,
          decision: input.decision,
          reason: input.reason,
          reviewerUserId: context.session.user.id,
          revisionId: input.id,
        })
      ),

    get: providerProfileRevisionReviewerProcedure
      .input(providerProfileRevisionIdInputSchema)
      .handler(({ context, input }) =>
        getProviderProfileRevisionForAdmin(context.db, input.id)
      ),

    list: providerProfileRevisionReviewerProcedure
      .input(providerProfileRevisionListInputSchema)
      .handler(({ context, input }) =>
        listProviderProfileRevisions(context.db, input)
      ),
  },

  adminProviderProfiles: {
    publishStatus: providerProfileRevisionReviewerProcedure
      .input(providerProfileStatusInputSchema)
      .handler(({ context, input }) =>
        publishProviderProfileStatus({
          database: context.db,
          profileId: input.id,
          reviewerUserId: context.session.user.id,
          status: input.status,
          statusReason: input.statusReason,
        })
      ),

    relinkOwnership: providerOwnershipManagerProcedure
      .input(providerOwnershipRelinkInputSchema)
      .handler(({ context, input }) =>
        relinkProviderOwnership({
          database: context.db,
          input,
          transferredByUserId: context.session.user.id,
        })
      ),
  },

  adminProviderRiskIncidents: {
    candidates: providerRiskIncidentModeratorProcedure
      .input(providerRiskIncidentCandidateListInputSchema)
      .handler(({ context, input }) =>
        listProviderRiskIncidentCandidates(context.db, input)
      ),

    confirmFraud: providerRiskIncidentManagerProcedure
      .input(providerRiskIncidentConfirmFraudInputSchema)
      .handler(({ context, input }) =>
        confirmProviderRiskIncidentFraud({
          database: context.db,
          incidentId: input.incidentId,
          reason: input.reason,
          reviewerUserId: context.session.user.id,
        })
      ),

    expire: providerRiskIncidentManagerProcedure.handler(({ context }) =>
      expireProviderRiskIncidentResponses({ database: context.db })
    ),

    get: providerRiskIncidentModeratorProcedure
      .input(providerRiskIncidentIdInputSchema)
      .handler(({ context, input }) =>
        getProviderRiskIncidentForAdmin(context.db, input.incidentId)
      ),

    link: providerRiskIncidentModeratorProcedure
      .input(providerRiskIncidentLinkInputSchema)
      .handler(({ context, input }) =>
        linkRiskReportToProvider({
          database: context.db,
          ...input,
          reviewerUserId: context.session.user.id,
        })
      ),

    list: providerRiskIncidentModeratorProcedure
      .input(providerRiskIncidentListInputSchema)
      .handler(({ context, input }) =>
        listProviderRiskIncidentsForAdmin(context.db, input)
      ),

    review: providerRiskIncidentModeratorProcedure
      .input(providerRiskIncidentReviewInputSchema)
      .handler(({ context, input }) =>
        reviewProviderRiskIncident({
          database: context.db,
          ...input,
          reviewerUserId: context.session.user.id,
        })
      ),
  },

  adminRiskCorrections: {
    decide: riskCorrectionModeratorProcedure
      .input(riskReportCorrectionDecisionInputSchema)
      .handler(({ context, input }) =>
        decideRiskReportCorrection({
          database: context.db,
          decision: input.decision,
          id: input.id,
          reason: input.reason,
          reviewerUserId: context.session.user.id,
        })
      ),

    list: riskCorrectionModeratorProcedure.handler(({ context }) =>
      listRiskReportCorrectionsForAdmin(context.db)
    ),
  },

  adminRiskReports: {
    decide: riskModeratorProcedure
      .input(riskReportAdminDecisionInputSchema)
      .handler(({ context, input }) =>
        decideRiskReport({
          database: context.db,
          decision: input.decision,
          id: input.id,
          publicSummary: input.publicSummary,
          reason: input.reason,
          reviewerUserId: context.session.user.id,
          underVerificationApproved: input.underVerificationApproved,
        })
      ),

    get: riskModeratorProcedure
      .input(riskReportAdminIdInputSchema)
      .handler(({ context, input }) =>
        getRiskReportForAdmin(context.db, input.id)
      ),

    getOriginalEvidenceUrl: riskModeratorProcedure
      .input(
        riskReportAdminIdInputSchema.extend({
          evidenceId: z.uuid(),
        })
      )
      .handler(({ context, input }) =>
        createRiskReportOriginalEvidenceUrl({
          database: context.db,
          evidenceId: input.evidenceId,
          reportId: input.id,
          storage: context.storage,
        })
      ),

    list: riskModeratorProcedure
      .input(riskReportAdminListInputSchema)
      .handler(({ context, input }) =>
        listRiskReportsForAdmin(context.db, input)
      ),

    registerDerivative: riskModeratorProcedure
      .input(riskReportDerivativeInputSchema)
      .handler(({ context, input }) =>
        registerRiskReportDerivative({ database: context.db, ...input })
      ),
  },

  adminSupportReviews: {
    approve: supportReviewManagerProcedure
      .input(supportReviewDecisionInputSchema)
      .handler(({ context, input }) =>
        approveSupportReview({
          approverUserId: context.session.user.id,
          database: context.db,
          input,
        })
      ),

    evaluate: supportReviewModeratorProcedure
      .input(supportReviewEligibilityInputSchema)
      .handler(({ context, input }) =>
        evaluateSupportReview({
          database: context.db,
          input,
          reviewerUserId: context.session.user.id,
        })
      ),

    get: supportReviewReadProcedure
      .input(supportReviewIdInputSchema)
      .handler(({ context, input }) =>
        getAdminSupportReview(context.db, input.reviewId)
      ),

    list: supportReviewReadProcedure
      .input(supportReviewListInputSchema)
      .handler(({ context, input }) =>
        listSupportReviewsForAdmin(context.db, input)
      ),

    reconsider: supportReviewModeratorProcedure
      .input(supportReviewReconsiderInputSchema)
      .handler(({ context, input }) =>
        reconsiderSupportReview({
          database: context.db,
          input,
          reviewerUserId: context.session.user.id,
        })
      ),

    recordOutcome: supportReviewOperatorProcedure
      .input(supportReviewOutcomeInputSchema)
      .handler(({ context, input }) =>
        recordSupportReviewOutcome({
          completeImmediately: true,
          database: context.db,
          input,
          recorderUserId: context.session.user.id,
        })
      ),

    start: supportReviewModeratorProcedure
      .input(supportReviewStartInputSchema)
      .handler(({ context, input }) =>
        startSupportReview({
          database: context.db,
          ...input,
          reviewerUserId: context.session.user.id,
        })
      ),
  },

  launchStatus: publicProcedure.handler(() =>
    getProtectionLaunchStatus(getProtectionLaunchConfiguration())
  ),

  providerApplication: {
    createDepositIntent: providerSensitiveProcedure
      .input(providerDepositIntentCreateInputSchema)
      .handler(({ context, input }) =>
        createProviderApplicationDepositIntent({
          amount: input.amount,
          database: context.db,
          providerUserId: context.session.user.id,
        })
      ),

    getDepositIntent: providerProcedure.handler(({ context }) =>
      getProviderDepositIntent({
        database: context.db,
        providerUserId: context.session.user.id,
      })
    ),

    getMine: providerProcedure.handler(({ context }) =>
      getProviderApplicationSnapshot(context.db, context.session.user.id)
    ),

    saveDraft: providerProcedure
      .input(providerApplicationDraftInputSchema)
      .handler(({ context, input }) =>
        saveProviderApplicationDraft(context.db, context.session.user.id, input)
      ),

    submit: providerSensitiveProcedure
      .input(providerApplicationSubmissionInputSchema)
      .handler(({ context, input }) =>
        submitProviderApplication(context.db, context.session.user.id, input)
      ),
  },

  providerBond: {
    createTopUpIntent: providerSensitiveProcedure
      .input(providerDepositIntentCreateInputSchema)
      .handler(({ context, input }) =>
        createProviderBondTopUpIntent({
          amount: input.amount,
          database: context.db,
          providerUserId: context.session.user.id,
        })
      ),

    getDepositIntent: providerProcedure.handler(({ context }) =>
      getProviderDepositIntent({
        database: context.db,
        providerUserId: context.session.user.id,
      })
    ),
  },

  providerBondWithdrawals: {
    get: providerProcedure.handler(({ context }) =>
      getProviderBondWithdrawal({
        database: context.db,
        providerUserId: context.session.user.id,
      })
    ),

    request: providerSensitiveProcedure
      .input(providerBondWithdrawalRequestInputSchema)
      .handler(({ context, input }) =>
        requestProviderBondWithdrawal({
          database: context.db,
          input,
          providerUserId: context.session.user.id,
        })
      ),
  },

  providerDepositIntents: {
    decide: providerDepositIntentAdminProcedure
      .input(providerDepositIntentManualDecisionInputSchema)
      .handler(({ context, input }) =>
        decideProviderDepositIntentManually({
          database: context.db,
          input,
          reviewerUserId: context.session.user.id,
        })
      ),

    list: providerDepositIntentAdminProcedure
      .input(providerDepositIntentAdminListInputSchema)
      .handler(({ context, input }) =>
        listProviderDepositIntentsForAdmin(context.db, input)
      ),
  },

  providerDirectory: {
    list: publicProcedure
      .input(providerDirectoryListInputSchema)
      .handler(({ context, input }) =>
        listProviderDirectory(context.db, input)
      ),

    search: publicProcedure
      .input(providerDirectorySearchInputSchema)
      .handler(({ context, input }) =>
        searchProviderDirectory(context.db, input.query, context.ipAddress)
      ),
  },

  providerNotifications: {
    list: providerProcedure
      .input(providerNotificationListInput)
      .handler(({ context, input }) =>
        listNotifications({
          database: context.db,
          input,
          userId: context.session.user.id,
        })
      ),

    markAllRead: providerProcedure.handler(({ context }) =>
      markAllNotificationsRead({
        database: context.db,
        userId: context.session.user.id,
      })
    ),

    markRead: providerProcedure
      .input(providerNotificationIdInput)
      .handler(({ context, input }) =>
        markNotificationRead({
          database: context.db,
          notificationId: input.notificationId,
          userId: context.session.user.id,
        })
      ),

    unreadCount: providerProcedure.handler(({ context }) =>
      getUnreadNotificationCount({
        database: context.db,
        userId: context.session.user.id,
      })
    ),
  },

  providerPolicy: {
    accept: providerProcedure
      .input(protectionPolicyVersionIdInputSchema)
      .handler(({ context, input }) =>
        acceptCurrentProtectionPolicy({
          database: context.db,
          policyVersionId: input.policyVersionId,
          providerUserId: context.session.user.id,
        })
      ),

    current: publicProcedure.handler(({ context }) =>
      getPublicCurrentProtectionPolicy(context.db)
    ),

    get: providerProcedure.handler(({ context }) =>
      getProviderProtectionPolicy(context.db, context.session.user.id)
    ),
  },

  providerProfileRevision: {
    getMine: providerProcedure.handler(({ context }) =>
      getProviderApplicationSnapshot(context.db, context.session.user.id)
    ),

    saveDraft: providerProcedure
      .input(providerProfileRevisionDraftInputSchema)
      .handler(({ context, input }) =>
        saveProviderProfileRevisionDraft(
          context.db,
          context.session.user.id,
          input
        )
      ),

    start: providerProcedure.handler(({ context }) =>
      startProviderProfileRevision(context.db, context.session.user.id)
    ),

    submit: providerSensitiveProcedure
      .input(providerProfileRevisionSubmissionInputSchema)
      .handler(({ context, input }) =>
        submitProviderProfileRevision(
          context.db,
          context.session.user.id,
          input
        )
      ),
  },

  providerRiskIncidents: {
    listMine: providerProcedure.handler(({ context }) =>
      listProviderRiskIncidentsForProvider({
        database: context.db,
        providerUserId: context.session.user.id,
      })
    ),

    registerEvidence: providerProcedure
      .input(providerRiskIncidentEvidenceInputSchema)
      .handler(({ context, input }) =>
        registerProviderRiskIncidentEvidence({
          database: context.db,
          ...input,
          providerUserId: context.session.user.id,
        })
      ),

    respond: providerProcedure
      .input(providerRiskIncidentResponseInputSchema)
      .handler(({ context, input }) =>
        submitProviderRiskIncidentResponse({
          database: context.db,
          ...input,
          providerUserId: context.session.user.id,
        })
      ),
  },

  providerWorkspace: providerProcedure.handler(async ({ context }) => {
    const [
      snapshot,
      riskIncidents,
      bond,
      bondWithdrawal,
      policy,
      depositIntent,
    ] = await Promise.all([
      getProviderApplicationSnapshot(context.db, context.session.user.id),
      listProviderRiskIncidentsForProvider({
        database: context.db,
        providerUserId: context.session.user.id,
      }),
      getProviderBondForProvider({
        database: context.db,
        providerUserId: context.session.user.id,
      }),
      getProviderBondWithdrawal({
        database: context.db,
        providerUserId: context.session.user.id,
      }),
      getProviderProtectionPolicy(context.db, context.session.user.id),
      getProviderDepositIntent({
        database: context.db,
        providerUserId: context.session.user.id,
      }),
    ]);

    return {
      bond,
      bondWithdrawal,
      depositIntent,
      identity: {
        id: context.session.user.id,
        name: context.session.user.name,
        role: context.session.user.role,
      },
      policy,
      privateProviderRecord: {
        source: "MARKETPLACE_ACCOUNT",
        visibility: "PRIVATE",
      },
      riskIncidents,
      ...snapshot,
    };
  }),

  publicProfile: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1).max(120) }))
    .handler(({ context, input }) =>
      getPublicProviderProfile(context.db, input.slug)
    ),

  publicRiskLookup: {
    search: publicProcedure
      .input(publicRiskIdentifierLookupInputSchema)
      .handler(({ context, input }) =>
        searchPublicRiskIdentifiers(context.db, input, context.ipAddress)
      ),

    statistics: publicProcedure.handler(({ context }) =>
      getPublicRiskStatistics(context.db, context.ipAddress)
    ),
  },

  publicRiskWarnings: {
    get: publicProcedure
      .input(publicRiskWarningIdInputSchema)
      .handler(({ context, input }) =>
        getPublicRiskWarning(
          context.db,
          input.slug,
          context.storage?.supabaseUrl
        )
      ),

    list: publicProcedure
      .input(publicRiskWarningListInputSchema)
      .handler(({ context, input }) =>
        listPublicRiskWarnings(context.db, input, context.storage?.supabaseUrl)
      ),
  },

  riskReport: {
    addEvidence: providerProcedure
      .input(riskReportEvidenceInputSchema)
      .handler(({ context, input }) =>
        addRiskReportEvidence(context.db, input, context.session.user.id)
      ),

    correctionsMine: providerProcedure.handler(({ context }) =>
      listRiskReportCorrectionsForRequester({
        database: context.db,
        requesterUserId: context.session.user.id,
      })
    ),

    deleteDraft: providerProcedure
      .input(riskReportOwnedInputSchema)
      .handler(({ context, input }) =>
        deleteRiskReportDraft({
          database: context.db,
          reportId: input.reportId,
          reporterUserId: context.session.user.id,
        })
      ),

    getMine: providerProcedure
      .input(riskReportMineInputSchema)
      .handler(({ context, input }) =>
        getRiskReportMine({
          database: context.db,
          reportId: input?.reportId,
          reporterUserId: context.session.user.id,
        })
      ),

    requestCorrection: providerProcedure
      .input(riskReportCorrectionRequestInputSchema)
      .handler(({ context, input }) =>
        requestRiskReportCorrection({
          database: context.db,
          input,
          requesterEmail: context.session.user.email,
          requesterName: context.session.user.name,
          requesterUserId: context.session.user.id,
        })
      ),

    requestWithdrawal: providerProcedure
      .input(riskReportWithdrawalInputSchema)
      .handler(({ context, input }) =>
        requestRiskReportWithdrawal({
          database: context.db,
          input,
          reporterUserId: context.session.user.id,
        })
      ),

    saveDraft: providerProcedure
      .input(riskReportDraftInputSchema)
      .handler(({ context, input }) =>
        saveRiskReportDraft({
          database: context.db,
          input,
          reporterEmail: context.session.user.email,
          reporterName: context.session.user.name,
          reporterUserId: context.session.user.id,
        })
      ),

    submit: providerProcedure
      .input(riskReportOwnedInputSchema)
      .handler(({ context, input }) =>
        submitRiskReport({
          database: context.db,
          input,
          ipAddress: context.ipAddress,
          reporterUserId: context.session.user.id,
        })
      ),
  },
};
