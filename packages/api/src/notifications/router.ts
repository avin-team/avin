import { z } from "zod";

import { protectedProcedure } from "../access/procedures";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  MAX_NOTIFICATION_PAGE_SIZE,
} from "./inbox";

const listNotificationsInput = z
  .object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(MAX_NOTIFICATION_PAGE_SIZE).optional(),
    unreadOnly: z.boolean().optional(),
  })
  .optional();

const notificationIdInput = z.object({ notificationId: z.uuid() });

export const notificationRouter = {
  list: protectedProcedure
    .input(listNotificationsInput)
    .handler(({ context, input }) =>
      listNotifications({
        database: context.db,
        input,
        userId: context.session.user.id,
      })
    ),

  markAllRead: protectedProcedure.handler(({ context }) =>
    markAllNotificationsRead({
      database: context.db,
      userId: context.session.user.id,
    })
  ),

  markRead: protectedProcedure
    .input(notificationIdInput)
    .handler(({ context, input }) =>
      markNotificationRead({
        database: context.db,
        notificationId: input.notificationId,
        userId: context.session.user.id,
      })
    ),

  unreadCount: protectedProcedure.handler(({ context }) =>
    getUnreadNotificationCount({
      database: context.db,
      userId: context.session.user.id,
    })
  ),
};
