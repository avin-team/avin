import { expireProviderRiskIncidentResponses } from "@avin/api/protection/provider-risk-incident-service";
import { db } from "@avin/db";

const PROVIDER_RISK_INCIDENT_MAINTENANCE_INTERVAL_MS = 60_000;

export const runProviderRiskIncidentMaintenance = async (
  now = new Date()
): Promise<void> => {
  try {
    await expireProviderRiskIncidentResponses({ database: db, now });
  } catch (error) {
    console.error("Provider risk incident maintenance failed", error);
  }
};

export const startProviderRiskIncidentMaintenanceSchedule = (): ReturnType<
  typeof setInterval
> => {
  const runMaintenance = (): void => {
    void runProviderRiskIncidentMaintenance();
  };

  runMaintenance();
  const timer = setInterval(
    runMaintenance,
    PROVIDER_RISK_INCIDENT_MAINTENANCE_INTERVAL_MS
  );
  timer.unref?.();
  return timer;
};
