import { db } from "@avin/db";

import { processSePayEvent } from "./processor";
import { normalizeSePayWebhookPayload, verifySePaySignature } from "./sepay";

export interface SePayWebhookConfiguration {
  receivingAccountNumber: string;
  secret: string;
  timestampWindowSeconds: number;
}

const jsonResponse = (
  body: Record<string, unknown>,
  status: number
): Response => Response.json(body, { status });

export const handleSePayWebhook = async ({
  configuration,
  database = db,
  processEvent = processSePayEvent,
  request,
}: {
  configuration: SePayWebhookConfiguration;
  database?: typeof db;
  processEvent?: typeof processSePayEvent;
  request: Request;
}): Promise<Response> => {
  if (
    !configuration.secret ||
    !configuration.receivingAccountNumber ||
    !configuration.timestampWindowSeconds
  ) {
    return jsonResponse(
      { message: "SePay webhook is not configured", success: false },
      503
    );
  }

  const body = await request.text();
  const timestamp = Number(request.headers.get("x-sepay-timestamp"));
  const signature = request.headers.get("x-sepay-signature") ?? "";
  const isValid = verifySePaySignature({
    body,
    maxAgeSeconds: configuration.timestampWindowSeconds,
    secret: configuration.secret,
    signature,
    timestamp,
  });

  if (!isValid) {
    return jsonResponse(
      { message: "Invalid SePay webhook signature", success: false },
      401
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body) as unknown;
  } catch {
    return jsonResponse({ message: "Invalid JSON", success: false }, 400);
  }

  let event;
  try {
    event = { ...normalizeSePayWebhookPayload(payload), rawBody: body };
  } catch {
    return jsonResponse(
      { message: "Invalid SePay webhook payload", success: false },
      400
    );
  }

  try {
    await processEvent(
      event,
      { receivingAccountNumber: configuration.receivingAccountNumber },
      new Date(),
      database
    );
  } catch {
    return jsonResponse(
      { message: "Webhook could not be durably processed", success: false },
      500
    );
  }

  return jsonResponse({ success: true }, 200);
};
