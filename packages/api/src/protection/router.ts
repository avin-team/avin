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

  providerWorkspace: providerProcedure.handler(async ({ context }) => {
    const snapshot = await getProviderApplicationSnapshot(
      context.db,
      context.session.user.id
    );

    return {
      identity: {
        id: context.session.user.id,
        name: context.session.user.name,
        role: ACCOUNT_ROLE.PROVIDER,
      },
      privateProviderRecord: {
        source: "PROVIDER_IDENTITY",
        visibility: "PRIVATE",
      },
      ...snapshot,
    };
  }),

  publicProfile: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1).max(120) }))
    .handler(({ context, input }) =>
      getPublicProviderProfile(context.db, input.slug)
    ),

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
