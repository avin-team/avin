import {
  ACCOUNT_ROLE,
  PROTECTION_ADMIN_CAPABILITY,
} from "@avin/auth/permissions";
import { z } from "zod";

import { providerProcedure, publicProcedure } from "../access/procedures";
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
import { getProtectionLaunchConfiguration } from "./configuration";
import {
  PROTECTION_MODULE_NAME,
  getProtectionLaunchStatus,
} from "./launch-gates";
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
  saveProviderApplicationDraft,
  saveProviderProfileRevisionDraft,
  startProviderProfileRevision,
  submitProviderApplication,
  submitProviderProfileRevision,
} from "./provider-application-service";
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
  riskReportDerivativeInputSchema,
  riskReportDraftInputSchema,
  riskReportEvidenceInputSchema,
  riskReportMineInputSchema,
  riskReportOwnedInputSchema,
  riskReportRequestEmailCodeInputSchema,
  riskReportVerifyEmailCodeInputSchema,
} from "./risk-report";
import {
  addRiskReportEvidence,
  createRiskReportOriginalEvidenceUrl,
  decideRiskReport,
  getPublicRiskWarning,
  getRiskReportForAdmin,
  getRiskReportMine,
  listPublicRiskWarnings,
  listRiskReportsForAdmin,
  registerRiskReportDerivative,
  requestRiskReportEmailCode,
  saveRiskReportDraft,
  submitRiskReport,
  verifyRiskReportEmailCode,
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

const providerProfileRevisionReviewerProcedure = protectionAdminProcedure({
  action: "protection.provider_profile_revision.review",
  capability: PROTECTION_ADMIN_CAPABILITY.PROVIDER_REVIEWER,
  purpose: "Review Provider profile revisions and publish immutable versions",
  target: {
    id: "PROTECTION_PROVIDER_PROFILE_REVISION_QUEUE",
    type: "PROTECTION_PROVIDER_PROFILE_REVISION_QUEUE",
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
  capability: PROTECTION_ADMIN_CAPABILITY.BOND_OPERATOR,
  purpose: "Record reconciled Provider Bond adjustments",
  target: {
    id: "PROTECTION_PROVIDER_BOND_QUEUE",
    type: "PROTECTION_PROVIDER_BOND_QUEUE",
  },
});

const providerBondManagerProcedure = protectionAdminProcedure({
  action: "protection.provider_bond.approve",
  capability: PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
  purpose: "Approve Provider Bond decreases and publish supported limits",
  target: {
    id: "PROTECTION_PROVIDER_BOND_QUEUE",
    type: "PROTECTION_PROVIDER_BOND_QUEUE",
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
  capability: PROTECTION_ADMIN_CAPABILITY.BOND_OPERATOR,
  purpose: "Record off-platform support outcome and Bond allocation",
  target: {
    id: "PROTECTION_SUPPORT_REVIEW_QUEUE",
    type: "PROTECTION_SUPPORT_REVIEW_QUEUE",
  },
});

const supportReviewManagerProcedure = protectionAdminProcedure({
  action: "protection.support_review.approve",
  capability: PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
  purpose: "Approve dual-controlled Support Review outcomes",
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
          database: context.db,
          input,
          recordedByUserId: context.session.user.id,
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
    getMine: providerProcedure.handler(({ context }) =>
      getProviderApplicationSnapshot(context.db, context.session.user.id)
    ),

    saveDraft: providerProcedure
      .input(providerApplicationDraftInputSchema)
      .handler(({ context, input }) =>
        saveProviderApplicationDraft(context.db, context.session.user.id, input)
      ),

    submit: providerProcedure
      .input(providerApplicationSubmissionInputSchema)
      .handler(({ context, input }) =>
        submitProviderApplication(context.db, context.session.user.id, input)
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

    submit: providerProcedure
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
    const [snapshot, riskIncidents, bond] = await Promise.all([
      getProviderApplicationSnapshot(context.db, context.session.user.id),
      listProviderRiskIncidentsForProvider({
        database: context.db,
        providerUserId: context.session.user.id,
      }),
      getProviderBondForProvider({
        database: context.db,
        providerUserId: context.session.user.id,
      }),
    ]);

    return {
      bond,
      identity: {
        id: context.session.user.id,
        name: context.session.user.name,
        role: ACCOUNT_ROLE.PROVIDER,
      },
      privateProviderRecord: {
        source: "PROVIDER_IDENTITY",
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
    addEvidence: publicProcedure
      .input(riskReportEvidenceInputSchema)
      .handler(({ context, input }) =>
        addRiskReportEvidence(context.db, input)
      ),

    getMine: publicProcedure
      .input(riskReportMineInputSchema)
      .handler(({ context, input }) =>
        getRiskReportMine({
          database: context.db,
          ...input,
        })
      ),

    requestEmailCode: publicProcedure
      .input(riskReportRequestEmailCodeInputSchema)
      .handler(({ context, input }) =>
        requestRiskReportEmailCode({ database: context.db, ...input })
      ),

    saveDraft: publicProcedure
      .input(riskReportDraftInputSchema)
      .handler(({ context, input }) => saveRiskReportDraft(context.db, input)),

    submit: publicProcedure
      .input(riskReportOwnedInputSchema)
      .handler(({ context, input }) => submitRiskReport(context.db, input)),

    verifyEmailCode: publicProcedure
      .input(riskReportVerifyEmailCodeInputSchema)
      .handler(({ context, input }) =>
        verifyRiskReportEmailCode({
          database: context.db,
          ipAddress: context.ipAddress,
          ...input,
        })
      ),
  },
};
