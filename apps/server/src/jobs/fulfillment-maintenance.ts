import { notifyDisputeResponseDeadlines } from "@avin/api/commerce/disputes";
import {
  cancelBannedSellerItems,
  expireDeliveryReviews,
} from "@avin/api/commerce/fulfillment";
import { db } from "@avin/db";

const FULFILLMENT_MAINTENANCE_INTERVAL_MS = 60_000;

const getMaintenanceTaskName = (index: number): string => {
  switch (index) {
    case 0: {
      return "delivery review expiry";
    }
    case 1: {
      return "banned Seller cancellation";
    }
    default: {
      return "dispute response deadline notification";
    }
  }
};

export const runFulfillmentMaintenance = async (
  now = new Date()
): Promise<void> => {
  const results = await Promise.allSettled([
    expireDeliveryReviews({ database: db, now }),
    cancelBannedSellerItems({ database: db, now }),
    notifyDisputeResponseDeadlines({ database: db, now }),
  ]);

  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      const taskName = getMaintenanceTaskName(index);
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
