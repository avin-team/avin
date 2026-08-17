import { createHash } from "node:crypto";

import { adminAuth, auth } from "@avin/auth";
import { AUTH_SURFACE, getAuthSurface } from "@avin/auth/auth-surfaces";
import { db } from "@avin/db";
import type { Context as HonoContext } from "hono";

import type { AdvisorProviderManager } from "../advisor/provider";
import { auditRecorder } from "./audit-recorder";
import type { ManagedObjectStore } from "./storage";

export interface CreateContextOptions {
  advisorProvider?: AdvisorProviderManager;
  context: HonoContext;
  storage?: ManagedObjectStore;
}

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export type MarketplaceSession = NonNullable<AuthSession>;

export interface AuditEvent {
  action: string;
  actorUserId: string;
  metadata?: Record<string, unknown>;
  outcome: "FAILURE" | "SUCCESS";
  targetId?: string;
  targetType?: string;
}

export interface AuditRecorder {
  record: (event: AuditEvent) => Promise<void>;
}

export const createContext = async ({
  advisorProvider,
  context,
  storage,
}: CreateContextOptions): Promise<Context> => {
  const authClient =
    getAuthSurface(context.req.raw.headers) === AUTH_SURFACE.ADMIN
      ? adminAuth
      : auth;
  const session = await authClient.api.getSession({
    headers: context.req.raw.headers,
  });
  const forwardedFor = context.req.header("x-forwarded-for");
  const realIp = context.req.header("x-real-ip");
  const requestIp = (forwardedFor?.split(",")[0] ?? realIp)?.trim();
  return {
    advisorProvider,
    audit: auditRecorder,
    db,
    requestIpHash: requestIp
      ? createHash("sha256").update(requestIp).digest("hex")
      : null,
    session,
    storage,
  };
};

export interface Context {
  advisorProvider?: AdvisorProviderManager;
  audit: AuditRecorder;
  db: typeof db;
  requestIpHash?: string | null;
  session: MarketplaceSession | null;
  storage?: ManagedObjectStore;
}
