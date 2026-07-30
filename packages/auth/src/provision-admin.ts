import { auditLog, user } from "@avin/db/schema/auth";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { ACCOUNT_ROLE } from "./permissions";

config({
  path: new URL("../../../apps/server/.env", import.meta.url),
});

const provisioningInput = z.object({
  email: z.email(),
  name: z.string().min(2),
  password: z.string().min(12),
});

const input = provisioningInput.parse({
  email: process.env.ADMIN_EMAIL,
  name: process.env.ADMIN_NAME,
  password: process.env.ADMIN_PASSWORD,
});

const [{ db }, { auth }] = await Promise.all([import("@avin/db"), import(".")]);

const existingUser = await db.query.user.findFirst({
  where: eq(user.email, input.email),
});

if (existingUser) {
  await db.delete(user).where(eq(user.id, existingUser.id));
}

const admin = await auth.api.createUser({
  body: {
    email: input.email,
    name: input.name,
    password: input.password,
    role: ACCOUNT_ROLE.ADMIN,
  },
});

await db
  .update(user)
  .set({
    emailVerified: true,
  })
  .where(eq(user.id, admin.user.id));

await db.insert(auditLog).values({
  action: "identity.provision-admin",
  actorUserId: "SYSTEM",
  outcome: "SUCCESS",
  targetId: admin.user.id,
  targetType: "USER",
});

process.stdout.write(
  `Successfully provisioned Admin ${admin.user.email} with verified status.\n`
);
