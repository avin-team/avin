import { auditLog } from "@avin/db/schema/auth";
import { config } from "dotenv";
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
const admin = await auth.api.createUser({
  body: {
    email: input.email,
    name: input.name,
    password: input.password,
    role: ACCOUNT_ROLE.ADMIN,
  },
});

await db.insert(auditLog).values({
  action: "identity.provision-admin",
  actorUserId: "SYSTEM",
  outcome: "SUCCESS",
  targetId: admin.user.id,
  targetType: "USER",
});

process.stdout.write(
  `Provisioned Admin ${admin.user.email}. Enroll two-factor authentication before using Admin APIs.\n`
);
