import { devToolsMiddleware } from "@ai-sdk/devtools";
import { google } from "@ai-sdk/google";
import { createContext } from "@avin/api/context";
import { appRouter } from "@avin/api/router";
import { adminAuth, auth } from "@avin/auth";
import { AUTH_SURFACE_HEADER } from "@avin/auth/auth-surfaces";
import { env } from "@avin/env/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { streamText, convertToModelMessages, wrapLanguageModel } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import {
  handleListingImageUpload,
  createListingImageUploadRouter,
} from "./uploads/listing-image-upload";
import { createListingImageStorage } from "./uploads/storage";

const app = new Hono();
const listingImageStorage = createListingImageStorage();
const listingImageUploadRouter = listingImageStorage
  ? createListingImageUploadRouter(listingImageStorage.client)
  : null;

app.use(logger());
app.use(
  "/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization", AUTH_SURFACE_HEADER],
    allowMethods: ["GET", "POST", "OPTIONS"],
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

  return handleListingImageUpload(c.req.raw, listingImageUploadRouter);
});

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

app.post("/ai", async (c) => {
  const body = await c.req.json();
  const uiMessages = body.messages || [];
  const model = wrapLanguageModel({
    middleware: devToolsMiddleware(),
    model: google("gemini-2.5-flash"),
  });
  const result = streamText({
    messages: await convertToModelMessages(uiMessages),
    model,
  });

  return result.toUIMessageStreamResponse();
});

app.get("/", (c) => c.text("OK"));

export default app;
