import { enforceProtectionPolicyDeadlines } from "@avin/api/protection/policy-service";
import { db } from "@avin/db";

const PROVIDER_POLICY_MAINTENANCE_INTERVAL_MS = 60_000;

export const runProviderPolicyMaintenance = async (
  now = new Date()
): Promise<void> => {
  try {
    await enforceProtectionPolicyDeadlines({ database: db, now });
  } catch (error) {
    console.error("Provider policy maintenance failed", error);
  }
};

export const startProviderPolicyMaintenanceSchedule = (): ReturnType<
  typeof setInterval
> => {
  const runMaintenance = (): void => {
    void runProviderPolicyMaintenance();
  };

  runMaintenance();
  const timer = setInterval(
    runMaintenance,
    PROVIDER_POLICY_MAINTENANCE_INTERVAL_MS
  );
  timer.unref?.();
  return timer;
};
