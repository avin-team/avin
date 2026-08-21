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
} from "./provider-application";
import {
  decideProviderApplication,
  getProviderApplicationForAdmin,
  getProviderApplicationSnapshot,
  getPublicProviderProfile,
  listProviderApplications,
  saveProviderApplicationDraft,
  submitProviderApplication,
} from "./provider-application-service";

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
};
