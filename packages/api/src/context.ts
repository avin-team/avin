import { auth } from "@avin/auth";
import type { Context as HonoContext } from "hono";

import { auditRecorder } from "./audit";

export interface CreateContextOptions {
  context: HonoContext;
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
  context,
}: CreateContextOptions): Promise<Context> => {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    audit: auditRecorder,
    session,
  };
};

export interface Context {
  audit: AuditRecorder;
  session: MarketplaceSession | null;
}
