import {
  createResendEmailSender,
  processEmailDeliveries,
} from "@avin/api/notifications/email-delivery";
import { processRiskReportEmailDeliveries } from "@avin/api/protection/risk-report-email-delivery";
import { db } from "@avin/db";
import { env } from "@avin/env/server";

const EMAIL_DELIVERY_INTERVAL_MS = 60_000;

const sender = createResendEmailSender({
  apiKey: env.RESEND_API_KEY,
  from: env.RESEND_FROM_EMAIL,
});

export const runEmailDelivery = async (): Promise<void> => {
  await processEmailDeliveries({ database: db, sender });
  await processRiskReportEmailDeliveries({ database: db, sender });
};

export const startEmailDeliverySchedule = (): ReturnType<
  typeof setInterval
> => {
  let running = false;
  const run = async (): Promise<void> => {
    if (running) {
      return;
    }
    running = true;
    try {
      await runEmailDelivery();
    } catch (error) {
      console.error("Email delivery worker failed", error);
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => {
    void run();
  }, EMAIL_DELIVERY_INTERVAL_MS);
  timer.unref?.();
  return timer;
};
