import { reconcileSePayTransactions } from "@avin/api/wallet/reconciliation";
import { db } from "@avin/db";
import { env } from "@avin/env/server";

const RECONCILIATION_INTERVAL_MS = 15 * 60_000;

const configuration = {
  apiToken: env.SEPAY_API_TOKEN ?? "",
  apiUrl: env.SEPAY_TRANSACTIONS_API_URL ?? "",
  receivingAccountNumber: env.SEPAY_BANK_ACCOUNT ?? "",
};

export const startSePayReconciliationSchedule = (): ReturnType<
  typeof setInterval
> | null => {
  if (
    !configuration.apiToken ||
    !configuration.apiUrl ||
    !configuration.receivingAccountNumber
  ) {
    return null;
  }

  const runReconciliation = async (): Promise<void> => {
    try {
      await reconcileSePayTransactions({ configuration, database: db });
    } catch (error) {
      console.error("SePay reconciliation failed", error);
    }
  };
  const timer = setInterval(() => {
    void runReconciliation();
  }, RECONCILIATION_INTERVAL_MS);

  timer.unref?.();
  return timer;
};
