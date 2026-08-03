import {
  cancelBannedSellerItems,
  expireDeliveryReviews,
} from "@avin/api/commerce/fulfillment";
import { db } from "@avin/db";

const FULFILLMENT_MAINTENANCE_INTERVAL_MS = 60_000;

export const runFulfillmentMaintenance = async (
  now = new Date()
): Promise<void> => {
  const results = await Promise.allSettled([
    expireDeliveryReviews({ database: db, now }),
    cancelBannedSellerItems({ database: db, now }),
  ]);

  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      const taskName =
        index === 0 ? "delivery review expiry" : "banned Seller cancellation";
      console.error(
        `Fulfillment maintenance failed: ${taskName}`,
        result.reason
      );
    }
  }
};

export const startFulfillmentMaintenanceSchedule = (): ReturnType<
  typeof setInterval
> => {
  const runMaintenance = (): void => {
    void runFulfillmentMaintenance();
  };

  runMaintenance();
  const timer = setInterval(
    runMaintenance,
    FULFILLMENT_MAINTENANCE_INTERVAL_MS
  );
  timer.unref?.();
  return timer;
};
