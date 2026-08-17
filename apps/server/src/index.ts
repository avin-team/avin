import { createContext } from "@avin/api/context";
import { appRouter } from "@avin/api/router";
import { handleSePayWebhook } from "@avin/api/wallet/webhook";
import { adminAuth, auth } from "@avin/auth";
import {
  AUTH_SURFACE,
  AUTH_SURFACE_HEADER,
  getAuthSurface,
} from "@avin/auth/auth-surfaces";
import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { db } from "@avin/db";
import { env } from "@avin/env/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { createAdvisorAttachmentUploadApp } from "./advisor-attachment-upload";
import { createAdvisorPreviewApp } from "./advisor-preview";
import {
  createAdvisorProviderManager,
  createAdvisorProviderRepository,
  fingerprintAdvisorApiKey,
} from "./advisor-provider-config";
import { startAdvisorSessionMaintenanceSchedule } from "./jobs/advisor-session-maintenance";
import { startEmailDeliverySchedule } from "./jobs/email-delivery";
import { startFulfillmentMaintenanceSchedule } from "./jobs/fulfillment-maintenance";
import { startOrderChatAttachmentMaintenanceSchedule } from "./jobs/order-chat-attachment-maintenance";
import { startSePayReconciliationSchedule } from "./jobs/sepay-reconciliation";
import {
  createOrderChatAttachmentUploadRouter,
  createDisputeEvidenceUploadRouter,
  createSellerEnforcementAppealEvidenceUploadRouter,
  createCheckoutAttachmentUploadRouter,
  createDeliveryAttachmentUploadRouter,
  handleUploadRequest,
  createListingImageUploadRouter,
} from "./uploads/listing-image-upload";
import { createListingImageStorage } from "./uploads/storage";

const app = new Hono();
const listingImageStorage = createListingImageStorage();
// This deployment-only attestation is populated by the operator after
// verifying the Groq organization control. It is never accepted from an API
// request and expires so a stale console check fails closed.
const advisorProviderManager = createAdvisorProviderManager({
  encryptionKey: env.ADVISOR_CONFIG_ENCRYPTION_KEY,
  repository: createAdvisorProviderRepository(db),
  verifyZeroDataRetention: (apiKey) =>
    Promise.resolve(
      env.GROQ_ZERO_DATA_RETENTION_VERIFIED === true &&
        env.GROQ_ZERO_DATA_RETENTION_KEY_FINGERPRINT ===
          fingerprintAdvisorApiKey(apiKey) &&
        env.GROQ_ZERO_DATA_RETENTION_VERIFICATION_EXPIRES_AT !== undefined &&
        env.GROQ_ZERO_DATA_RETENTION_VERIFICATION_EXPIRES_AT.getTime() >
          Date.now()
    ),
});
const advisorPreviewApp = createAdvisorPreviewApp({
  getModel: () => advisorProviderManager.getActiveModel(),
  getProviderKeyFingerprint: () =>
    advisorProviderManager.getActiveKeyFingerprint(),
  isAuthorized: async (request) => {
    const authClient =
      getAuthSurface(request.headers) === AUTH_SURFACE.ADMIN ? adminAuth : auth;
    const session = await authClient.api.getSession({
      headers: request.headers,
    });
    return (
      session?.user.role === ACCOUNT_ROLE.ADMIN &&
      session.user.twoFactorEnabled === true
    );
  },
  reportProviderError: async (keyFingerprint) => {
    await advisorProviderManager.markUnavailable(keyFingerprint);
  },
});
const advisorAttachmentApp = createAdvisorAttachmentUploadApp({
  database: db,
  storage: listingImageStorage?.objectStore,
});
const listingImageUploadRouter = listingImageStorage
  ? createListingImageUploadRouter(listingImageStorage.client)
  : null;
const orderChatAttachmentUploadRouter = listingImageStorage
  ? createOrderChatAttachmentUploadRouter(listingImageStorage.client)
  : null;
const disputeEvidenceUploadRouter = listingImageStorage
  ? createDisputeEvidenceUploadRouter(listingImageStorage.client)
  : null;
const sellerEnforcementAppealEvidenceUploadRouter = listingImageStorage
  ? createSellerEnforcementAppealEvidenceUploadRouter(
      listingImageStorage.client
    )
  : null;
const checkoutAttachmentUploadRouter = listingImageStorage
  ? createCheckoutAttachmentUploadRouter(listingImageStorage.client)
  : null;
const deliveryAttachmentUploadRouter = listingImageStorage
  ? createDeliveryAttachmentUploadRouter(listingImageStorage.client)
  : null;

const sePayWebhookConfiguration = {
  receivingAccountNumber: env.SEPAY_BANK_ACCOUNT ?? "",
  secret: env.SEPAY_WEBHOOK_SECRET ?? "",
  timestampWindowSeconds: env.SEPAY_WEBHOOK_TIMESTAMP_WINDOW_SECONDS,
};

app.use(logger());
app.use(
  "/*",
  secureHeaders({
    crossOriginResourcePolicy: false,
    strictTransportSecurity:
      env.NODE_ENV === "production" ? "max-age=31536000" : false,
    xFrameOptions: "DENY",
  })
);
app.use(
  "/*",
  cors({
    allowHeaders: [
      "Content-Type",
      "Authorization",
      AUTH_SURFACE_HEADER,
      "X-Advisor-Visitor-Capability",
    ],
    allowMethods: ["DELETE", "GET", "POST", "OPTIONS"],
    credentials: true,
    origin: env.CORS_ORIGIN,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.on(["POST", "GET"], "/api/admin-auth/*", (c) =>
  adminAuth.handler(c.req.raw)
);

app.post("/api/upload", (c) => {
  if (!listingImageUploadRouter) {
    return c.json({ error: "Media uploads are not configured" }, 503);
  }

  return handleUploadRequest(c.req.raw, listingImageUploadRouter);
});

app.post("/api/order-chat-upload", (c) => {
  if (!orderChatAttachmentUploadRouter) {
    return c.json(
      { error: "Order attachment uploads are not configured" },
      503
    );
  }

  return handleUploadRequest(c.req.raw, orderChatAttachmentUploadRouter);
});

app.post("/api/dispute-evidence-upload", (c) => {
  if (!disputeEvidenceUploadRouter) {
    return c.json(
      { error: "Dispute evidence uploads are not configured" },
      503
    );
  }

  return handleUploadRequest(c.req.raw, disputeEvidenceUploadRouter);
});

app.post("/api/seller-enforcement-appeal-evidence-upload", (c) => {
  if (!sellerEnforcementAppealEvidenceUploadRouter) {
    return c.json(
      {
        error: "Seller Enforcement appeal evidence uploads are not configured",
      },
      503
    );
  }

  return handleUploadRequest(
    c.req.raw,
    sellerEnforcementAppealEvidenceUploadRouter
  );
});

app.post("/api/checkout-attachment-upload", (c) => {
  if (!checkoutAttachmentUploadRouter) {
    return c.json(
      { error: "Checkout attachment uploads are not configured" },
      503
    );
  }

  return handleUploadRequest(c.req.raw, checkoutAttachmentUploadRouter);
});

app.post("/api/delivery-attachment-upload", (c) => {
  if (!deliveryAttachmentUploadRouter) {
    return c.json(
      { error: "Delivery attachment uploads are not configured" },
      503
    );
  }

  return handleUploadRequest(c.req.raw, deliveryAttachmentUploadRouter);
});

app.route("/", advisorPreviewApp);
app.route("/", advisorAttachmentApp);

const sePayWebhook = (c: { req: { raw: Request } }) =>
  handleSePayWebhook({
    configuration: sePayWebhookConfiguration,
    request: c.req.raw,
  });

app.post("/webhook/sepay", sePayWebhook);

export const apiHandler = new OpenAPIHandler(appRouter, {
  interceptors: [
    onError((cause) => {
      console.error(cause);
    }),
  ],
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((cause) => {
      console.error(cause);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({
    advisorProvider: advisorProviderManager,
    context: c,
    storage: listingImageStorage?.objectStore,
  });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    context,
    prefix: "/rpc",
  });

  if (rpcResult.matched) {
    return rpcResult.response;
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    context,
    prefix: "/api-reference",
  });

  if (apiResult.matched) {
    return apiResult.response;
  }

  return next();
});

app.get("/", (c) => c.text("OK"));

export default app;

startSePayReconciliationSchedule();
startFulfillmentMaintenanceSchedule();
startOrderChatAttachmentMaintenanceSchedule();
startAdvisorSessionMaintenanceSchedule();
startEmailDeliverySchedule();
