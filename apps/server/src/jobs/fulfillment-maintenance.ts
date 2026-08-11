import { notifyDisputeResponseDeadlines } from "@avin/api/commerce/disputes";
import {
  expireDeliveryReviews,
  expireWarranties,
} from "@avin/api/commerce/fulfillment";
import { runSellerEnforcementRemediation } from "@avin/api/seller-enforcement/remediation";
import { expireSellerEnforcements } from "@avin/api/seller-enforcement/service";
import { db } from "@avin/db";

const FULFILLMENT_MAINTENANCE_INTERVAL_MS = 60_000;

const getMaintenanceTaskName = (index: number): string => {
  switch (index) {
    case 0: {
      return "delivery review expiry";
    }
    case 1: {
      return "warranty expiry";
    }
    case 2: {
      return "Seller Enforcement expiry";
    }
    case 3: {
      return "Seller Enforcement remediation";
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
    expireWarranties({ database: db, now }),
    expireSellerEnforcements({ database: db, now }),
    runSellerEnforcementRemediation({ database: db, now }),
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
