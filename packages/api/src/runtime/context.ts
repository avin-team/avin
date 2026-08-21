import { adminAuth, auth, providerAuth } from "@avin/auth";
import { AUTH_SURFACE, getAuthSurface } from "@avin/auth/auth-surfaces";
import type { ProtectionAdminCapability } from "@avin/auth/permissions";
import { db } from "@avin/db";
import type { Context as HonoContext } from "hono";

import { auditRecorder } from "./audit-recorder";
import type { ManagedObjectStore } from "./storage";

export interface CreateContextOptions {
  context: HonoContext;
  storage?: ManagedObjectStore;
}

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export type MarketplaceSession = NonNullable<AuthSession>;

export interface AuditEvent {
  action: string;
  actorUserId: string;
  createdAt?: Date;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  outcome: "FAILURE" | "SUCCESS";
  purpose?: string;
  sessionId?: string;
  targetId?: string;
  targetType?: string;
}

export interface AuditRecorder {
  record: (event: AuditEvent) => Promise<void>;
}

export const createContext = async ({
  context,
  storage,
}: CreateContextOptions): Promise<Context> => {
  const authSurface = getAuthSurface(context.req.raw.headers);
  let authClient = auth;
  if (authSurface === AUTH_SURFACE.ADMIN) {
    authClient = adminAuth;
  } else if (authSurface === AUTH_SURFACE.PROVIDER) {
    authClient = providerAuth;
  }
  const session = await authClient.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    audit: auditRecorder,
    db,
    ipAddress:
      context.req.raw.headers.get("cf-connecting-ip") ??
      context.req.raw.headers.get("x-real-ip") ??
      context.req.raw.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    session,
    storage,
  };
};

export interface Context {
  audit: AuditRecorder;
  db: typeof db;
  ipAddress?: string;
  protectionCapabilities?: readonly ProtectionAdminCapability[];
  session: MarketplaceSession | null;
  storage?: ManagedObjectStore;
}
