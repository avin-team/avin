import { cleanupExpiredAdvisorSessions } from "@avin/api/advisor/advisor";
import { cleanupAdvisorAnalyticsEvents } from "@avin/api/advisor/analytics";
import { db } from "@avin/db";

import { createListingImageStorage } from "../uploads/storage";

const ADVISOR_SESSION_MAINTENANCE_INTERVAL_MS = 15 * 60_000;
const storage = createListingImageStorage()?.objectStore;

export const runAdvisorSessionMaintenance = async (
  now = new Date()
): Promise<void> => {
  try {
    await cleanupExpiredAdvisorSessions({ database: db, now, storage });
  } catch (error) {
    console.error("Advisor session maintenance failed", error);
  }
  try {
    await cleanupAdvisorAnalyticsEvents({ database: db, now });
  } catch (error) {
    console.error("Advisor analytics maintenance failed", error);
  }
};

export const startAdvisorSessionMaintenanceSchedule = (): ReturnType<
  typeof setInterval
> => {
  const runMaintenance = (): void => {
    void runAdvisorSessionMaintenance();
  };

  runMaintenance();
  const timer = setInterval(
    runMaintenance,
    ADVISOR_SESSION_MAINTENANCE_INTERVAL_MS
  );
  timer.unref?.();
  return timer;
};
