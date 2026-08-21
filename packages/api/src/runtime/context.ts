import { adminAuth, auth } from "@avin/auth";
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
  const authClient =
    getAuthSurface(context.req.raw.headers) === AUTH_SURFACE.ADMIN
      ? adminAuth
      : auth;
  const session = await authClient.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    audit: auditRecorder,
    db,
    session,
    storage,
  };
};

export interface Context {
  audit: AuditRecorder;
  db: typeof db;
  protectionCapabilities?: readonly ProtectionAdminCapability[];
  session: MarketplaceSession | null;
  storage?: ManagedObjectStore;
}
