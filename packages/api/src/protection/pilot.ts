import { user } from "@avin/db/schema/auth";
import {
  protectionPilotConfiguration,
  protectionPilotInvitation,
  protectionProviderProfile,
} from "@avin/db/schema/protection";
import { ORPCError } from "@orpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../runtime/context";

type Database = Context["db"];
type PilotConfiguration = typeof protectionPilotConfiguration.$inferSelect;

export const PROTECTION_PILOT_CONFIGURATION_ID = "DEFAULT";
export const DEFAULT_PROTECTION_PILOT_APPROVAL_CAP = 10;

export const protectionPilotConfigurationInputSchema = z.object({
  approvalCap: z.number().int().min(10).max(20),
  enabled: z.boolean(),
});

export const protectionPilotInvitationInputSchema = z.object({
  email: z.email(),
});

export type ProtectionPilotConfigurationInput = z.infer<
  typeof protectionPilotConfigurationInputSchema
>;

export type ProtectionPilotInvitationInput = z.infer<
  typeof protectionPilotInvitationInputSchema
>;

const defaultConfiguration = (): Omit<
  PilotConfiguration,
  "updatedAt" | "updatedByUserId"
> & {
  updatedAt: Date | null;
  updatedByUserId: string | null;
} => ({
  approvalCap: DEFAULT_PROTECTION_PILOT_APPROVAL_CAP,
  enabled: true,
  id: PROTECTION_PILOT_CONFIGURATION_ID,
  updatedAt: null,
  updatedByUserId: null,
});

const toConfigurationView = (configuration: PilotConfiguration | null) => {
  const value = configuration ?? defaultConfiguration();
  return {
    approvalCap: value.approvalCap,
    enabled: value.enabled,
    id: value.id,
    updatedAt: value.updatedAt?.toISOString() ?? null,
    updatedByUserId: value.updatedByUserId,
  };
};

const findConfiguration = async (
  database: Database,
  forUpdate = false
): Promise<PilotConfiguration | null> => {
  const query = database
    .select()
    .from(protectionPilotConfiguration)
    .where(
      eq(protectionPilotConfiguration.id, PROTECTION_PILOT_CONFIGURATION_ID)
    );
  if (forUpdate) {
    const [configuration] = await query.for("update").limit(1);
    return configuration ?? null;
  }
  const [configuration] = await query.limit(1);
  return configuration ?? null;
};

export const getProtectionPilotConfiguration = async (database: Database) =>
  toConfigurationView(await findConfiguration(database));

export const updateProtectionPilotConfiguration = async ({
  database,
  input,
  updatedByUserId,
}: {
  database: Database;
  input: ProtectionPilotConfigurationInput;
  updatedByUserId: string;
}) => {
  const parsedInput = protectionPilotConfigurationInputSchema.parse(input);
  const now = new Date();
  const [configuration] = await database
    .insert(protectionPilotConfiguration)
    .values({
      approvalCap: parsedInput.approvalCap,
      enabled: parsedInput.enabled,
      id: PROTECTION_PILOT_CONFIGURATION_ID,
      updatedAt: now,
      updatedByUserId,
    })
    .onConflictDoUpdate({
      set: {
        approvalCap: parsedInput.approvalCap,
        enabled: parsedInput.enabled,
        updatedAt: now,
        updatedByUserId,
      },
      target: protectionPilotConfiguration.id,
    })
    .returning();

  if (!configuration) {
    throw new ORPCError("CONFLICT", {
      message: "Protection pilot configuration could not be updated",
    });
  }
  return toConfigurationView(configuration);
};

export const listProtectionPilotInvitations = async (database: Database) => {
  const rows = await database
    .select({
      invitation: protectionPilotInvitation,
      provider: user,
    })
    .from(protectionPilotInvitation)
    .innerJoin(user, eq(protectionPilotInvitation.providerUserId, user.id))
    .orderBy(desc(protectionPilotInvitation.createdAt))
    .execute();

  return rows.map(({ invitation, provider }) => ({
    createdAt: invitation.createdAt.toISOString(),
    email: provider.email,
    id: invitation.id,
    name: provider.name,
    providerUserId: invitation.providerUserId,
    usedAt: invitation.usedAt?.toISOString() ?? null,
  }));
};

export const inviteProtectionPilotProvider = async ({
  database,
  input,
  invitedByUserId,
}: {
  database: Database;
  input: ProtectionPilotInvitationInput;
  invitedByUserId: string;
}) => {
  const parsedInput = protectionPilotInvitationInputSchema.parse(input);
  const normalizedEmail = parsedInput.email.trim().toLowerCase();
  const [provider] = await database
    .select()
    .from(user)
    .where(eq(user.email, normalizedEmail))
    .limit(1);
  if (!provider || (provider.role !== "BUYER" && provider.role !== "SELLER")) {
    throw new ORPCError("NOT_FOUND", {
      message: "A Buyer or Seller account with this email does not exist",
    });
  }

  const [invitation] = await database
    .insert(protectionPilotInvitation)
    .values({
      invitedByUserId,
      providerUserId: provider.id,
    })
    .onConflictDoNothing({ target: protectionPilotInvitation.providerUserId })
    .returning();
  if (invitation) {
    return {
      createdAt: invitation.createdAt.toISOString(),
      email: provider.email,
      id: invitation.id,
      name: provider.name,
      providerUserId: invitation.providerUserId,
      usedAt: invitation.usedAt?.toISOString() ?? null,
    };
  }

  const [existing] = await database
    .select()
    .from(protectionPilotInvitation)
    .where(eq(protectionPilotInvitation.providerUserId, provider.id))
    .limit(1);
  if (!existing) {
    throw new ORPCError("CONFLICT", {
      message: "Protection pilot invitation could not be created",
    });
  }
  return {
    createdAt: existing.createdAt.toISOString(),
    email: provider.email,
    id: existing.id,
    name: provider.name,
    providerUserId: existing.providerUserId,
    usedAt: existing.usedAt?.toISOString() ?? null,
  };
};

export const assertProtectionPilotApprovalAllowed = async (
  database: Database,
  providerUserId: string
) => {
  const configuration = await findConfiguration(database, true);
  const effectiveConfiguration = configuration ?? {
    ...defaultConfiguration(),
  };
  if (!effectiveConfiguration.enabled) {
    return null;
  }
  if (
    effectiveConfiguration.approvalCap < 10 ||
    effectiveConfiguration.approvalCap > 20
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Protection pilot approval cap must remain between 10 and 20",
    });
  }

  const [invitation] = await database
    .select()
    .from(protectionPilotInvitation)
    .where(eq(protectionPilotInvitation.providerUserId, providerUserId))
    .limit(1);
  if (!invitation) {
    throw new ORPCError("FORBIDDEN", {
      message: "Only invited Providers can be approved during the pilot",
    });
  }

  const profiles = await database
    .select({ id: protectionProviderProfile.id })
    .from(protectionProviderProfile)
    .execute();
  if (profiles.length >= effectiveConfiguration.approvalCap) {
    throw new ORPCError("CONFLICT", {
      message: `The invitation-limited pilot has reached its ${effectiveConfiguration.approvalCap}-Provider approval cap`,
    });
  }
  return invitation;
};

export const markProtectionPilotInvitationUsed = async (
  database: Database,
  providerUserId: string,
  usedAt = new Date()
): Promise<void> => {
  await database
    .update(protectionPilotInvitation)
    .set({ usedAt })
    .where(eq(protectionPilotInvitation.providerUserId, providerUserId));
};
