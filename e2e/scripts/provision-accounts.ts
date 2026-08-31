import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";

import {
  config as loadEnvironmentFile,
  parse as parseEnvironmentFile,
} from "dotenv";
import * as OTPAuth from "otpauth";

const LOCAL_ENVIRONMENT_URL = new URL("../.env.local", import.meta.url);
const SERVER_ENVIRONMENT_URL = new URL(
  "../../apps/server/.env",
  import.meta.url
);
const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const STOREFRONT_EMAIL = "e2e-buyer@avin.test";
const SELLER_EMAIL = "e2e-seller@avin.test";
const ONBOARDING_SELLER_EMAIL = "e2e-onboarding-seller@avin.test";
const ENFORCEMENT_SELLER_EMAIL = "e2e-enforcement-seller@avin.test";
const PROVIDER_EMAIL = "e2e-provider@avin.test";
const ADMIN_EMAIL = "e2e-admin@avin.test";
const SELLER_STORE_SLUG = "avin-e2e-store";
const ENFORCEMENT_SELLER_STORE_SLUG = "avin-e2e-enforcement-store";
const SELLER_AGREEMENT_VERSION = "v1.0";

loadEnvironmentFile({ path: SERVER_ENVIRONMENT_URL, quiet: true });
loadEnvironmentFile({ path: LOCAL_ENVIRONMENT_URL, quiet: true });

const databaseURL = process.env.DATABASE_URL;
const authBaseURL = process.env.BETTER_AUTH_URL;

if (!(databaseURL && authBaseURL)) {
  throw new Error(
    "DATABASE_URL and BETTER_AUTH_URL are required to provision E2E accounts."
  );
}

const parsedDatabaseURL = new URL(databaseURL);
const parsedAuthBaseURL = new URL(authBaseURL);

if (
  process.env.NODE_ENV === "production" ||
  !LOCAL_DATABASE_HOSTS.has(parsedDatabaseURL.hostname)
) {
  throw new Error(
    `Refusing to provision E2E accounts outside a local database. Received host "${parsedDatabaseURL.hostname}".`
  );
}

const createAuthRequestHeaders = (cookie?: string): Headers => {
  const headers = new Headers({
    host: parsedAuthBaseURL.host,
    "x-forwarded-proto": parsedAuthBaseURL.protocol.replace(":", ""),
  });

  if (cookie) {
    headers.set("cookie", cookie);
  }

  return headers;
};

const readLocalEnvironment = async (): Promise<Record<string, string>> => {
  try {
    return parseEnvironmentFile(await readFile(LOCAL_ENVIRONMENT_URL));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
};

const createPassword = (): string =>
  `Avin-e2e-${randomBytes(24).toString("base64url")}`;

const serializeEnvironment = (environment: Record<string, string>): string =>
  `${Object.entries(environment)
    .toSorted(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n")}\n`;

const persistLocalEnvironment = async (
  environment: Record<string, string>
): Promise<void> => {
  await writeFile(LOCAL_ENVIRONMENT_URL, serializeEnvironment(environment), {
    mode: 0o600,
  });
  await chmod(LOCAL_ENVIRONMENT_URL, 0o600);
};

const getCookieHeader = (headers: Headers): string => {
  const setCookies = headers.getSetCookie();
  const cookieHeader = setCookies
    .map((setCookie) => setCookie.split(";", 1)[0])
    .filter((cookie): cookie is string => Boolean(cookie))
    .join("; ");

  if (!cookieHeader) {
    throw new Error("Better Auth did not return a session cookie.");
  }

  return cookieHeader;
};

const extractTotpSecret = (totpURI: string): string => {
  const secret = new URL(totpURI).searchParams.get("secret");

  if (!secret) {
    throw new Error("Better Auth returned a TOTP URI without a secret.");
  }

  return secret;
};

const generateTotpCode = (secret: string): string =>
  new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  }).generate();

const localEnvironment = await readLocalEnvironment();
const storefrontPassword =
  localEnvironment.E2E_USER_PASSWORD || createPassword();
const sellerPassword = localEnvironment.E2E_SELLER_PASSWORD || createPassword();
let onboardingSellerPassword =
  localEnvironment.E2E_ONBOARDING_SELLER_PASSWORD || createPassword();
let enforcementSellerPassword =
  localEnvironment.E2E_ENFORCEMENT_SELLER_PASSWORD || createPassword();
let providerPassword =
  localEnvironment.E2E_PROVIDER_PASSWORD || createPassword();
const adminPassword = localEnvironment.E2E_ADMIN_PASSWORD || createPassword();
const storefrontEmail = localEnvironment.E2E_USER_EMAIL || STOREFRONT_EMAIL;
const sellerEmail = localEnvironment.E2E_SELLER_EMAIL || SELLER_EMAIL;
let onboardingSellerEmail =
  localEnvironment.E2E_ONBOARDING_SELLER_EMAIL || ONBOARDING_SELLER_EMAIL;
let enforcementSellerEmail =
  localEnvironment.E2E_ENFORCEMENT_SELLER_EMAIL || ENFORCEMENT_SELLER_EMAIL;
let enforcementSellerStoreSlug = ENFORCEMENT_SELLER_STORE_SLUG;
let providerEmail = localEnvironment.E2E_PROVIDER_EMAIL || PROVIDER_EMAIL;
const adminEmail = localEnvironment.E2E_ADMIN_EMAIL || ADMIN_EMAIL;

localEnvironment.E2E_TARGET = "local";
localEnvironment.E2E_USER_EMAIL = storefrontEmail;
localEnvironment.E2E_USER_PASSWORD = storefrontPassword;
localEnvironment.E2E_SELLER_EMAIL = sellerEmail;
localEnvironment.E2E_SELLER_PASSWORD = sellerPassword;
localEnvironment.E2E_ONBOARDING_SELLER_EMAIL = onboardingSellerEmail;
localEnvironment.E2E_ONBOARDING_SELLER_PASSWORD = onboardingSellerPassword;
localEnvironment.E2E_ENFORCEMENT_SELLER_EMAIL = enforcementSellerEmail;
localEnvironment.E2E_ENFORCEMENT_SELLER_PASSWORD = enforcementSellerPassword;
localEnvironment.E2E_PROVIDER_EMAIL = providerEmail;
localEnvironment.E2E_PROVIDER_PASSWORD = providerPassword;
localEnvironment.E2E_ADMIN_EMAIL = adminEmail;
localEnvironment.E2E_ADMIN_PASSWORD = adminPassword;
localEnvironment.E2E_ADMIN_TOTP_SECRET ||= "";
localEnvironment.E2E_SEPAY_BANK_ACCOUNT ||=
  process.env.SEPAY_BANK_ACCOUNT || "";
localEnvironment.E2E_SEPAY_WEBHOOK_SECRET ||=
  process.env.SEPAY_WEBHOOK_SECRET || "";

await persistLocalEnvironment(localEnvironment);

const [{ auth, adminAuth }, { db }, authSchema, drizzle] = await Promise.all([
  import("@avin/auth"),
  import("@avin/db"),
  import("@avin/db/schema/auth"),
  import("drizzle-orm"),
]);
const { protectionAdminAssignment, user } = authSchema;
const { protectionProviderApplication } =
  await import("@avin/db/schema/protection");
const { sellerApplication, sellerProfile } =
  await import("@avin/db/schema/seller");
const { sellerEnforcement } =
  await import("@avin/db/schema/seller-enforcement");
const { eq } = drizzle;
const authContext = await auth.$context;

const findUserByEmail = (email: string) =>
  db.query.user.findFirst({ where: eq(user.email, email) });

const existingProviderUser = await findUserByEmail(providerEmail);
const existingProviderApplication = existingProviderUser
  ? await db.query.protectionProviderApplication.findFirst({
      where: eq(
        protectionProviderApplication.providerUserId,
        existingProviderUser.id
      ),
    })
  : undefined;

if (
  existingProviderApplication &&
  !["DRAFT", "CHANGES_REQUESTED"].includes(existingProviderApplication.status)
) {
  providerEmail = `e2e-provider-${Date.now()}@avin.test`;
  providerPassword = createPassword();
  localEnvironment.E2E_PROVIDER_EMAIL = providerEmail;
  localEnvironment.E2E_PROVIDER_PASSWORD = providerPassword;
  await persistLocalEnvironment(localEnvironment);
}

const existingOnboardingSellerUser = await findUserByEmail(
  onboardingSellerEmail
);
const existingOnboardingSellerApplication = existingOnboardingSellerUser
  ? await db.query.sellerApplication.findFirst({
      where: eq(sellerApplication.userId, existingOnboardingSellerUser.id),
    })
  : undefined;

if (existingOnboardingSellerApplication) {
  onboardingSellerEmail = `e2e-onboarding-seller-${Date.now()}@avin.test`;
  onboardingSellerPassword = createPassword();
  localEnvironment.E2E_ONBOARDING_SELLER_EMAIL = onboardingSellerEmail;
  localEnvironment.E2E_ONBOARDING_SELLER_PASSWORD = onboardingSellerPassword;
  await persistLocalEnvironment(localEnvironment);
}

const existingEnforcementSellerUser = await findUserByEmail(
  enforcementSellerEmail
);
const existingEnforcement = existingEnforcementSellerUser
  ? await db.query.sellerEnforcement.findFirst({
      where: eq(sellerEnforcement.sellerId, existingEnforcementSellerUser.id),
    })
  : undefined;

if (existingEnforcement) {
  enforcementSellerEmail = `e2e-enforcement-seller-${Date.now()}@avin.test`;
  enforcementSellerPassword = createPassword();
  enforcementSellerStoreSlug = `${ENFORCEMENT_SELLER_STORE_SLUG}-${Date.now()}`;
  localEnvironment.E2E_ENFORCEMENT_SELLER_EMAIL = enforcementSellerEmail;
  localEnvironment.E2E_ENFORCEMENT_SELLER_PASSWORD = enforcementSellerPassword;
  await persistLocalEnvironment(localEnvironment);
}

const existingEnforcementStoreProfile = await db.query.sellerProfile.findFirst({
  where: eq(sellerProfile.storeSlug, enforcementSellerStoreSlug),
});

if (existingEnforcementStoreProfile) {
  enforcementSellerStoreSlug = `${ENFORCEMENT_SELLER_STORE_SLUG}-${Date.now()}`;
}

const ensureUser = async ({
  email,
  name,
  password,
  role,
}: {
  email: string;
  name: string;
  password: string;
  role: "ADMIN" | "BUYER" | "SELLER";
}) => {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    if (existingUser.role !== role) {
      throw new Error(
        `Existing E2E account ${email} has role ${existingUser.role}, expected ${role}.`
      );
    }

    if (!existingUser.emailVerified) {
      await db
        .update(user)
        .set({ emailVerified: true })
        .where(eq(user.id, existingUser.id));
    }

    return { created: false, user: existingUser };
  }

  const hashedPassword = await authContext.password.hash(password);
  const createdUser = await authContext.internalAdapter.createUser({
    email,
    emailVerified: true,
    name,
    role,
  });

  if (!createdUser) {
    throw new Error(`Unable to create E2E account ${email}.`);
  }

  await authContext.internalAdapter.linkAccount({
    accountId: createdUser.id,
    password: hashedPassword,
    providerId: "credential",
    userId: createdUser.id,
  });
  await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.id, createdUser.id));

  return { created: true, user: createdUser };
};

interface SellerWorkspaceOptions {
  applicantName: string;
  email: string;
  storeSlug: string;
  storefrontName: string;
}

const ensureSellerWorkspace = async (
  sellerUserId: string,
  options: Partial<SellerWorkspaceOptions> = {}
): Promise<void> => {
  const workspaceApplicantName = options.applicantName ?? "Avin E2E Seller";
  const workspaceEmail = options.email ?? sellerEmail;
  const workspaceStoreSlug = options.storeSlug ?? SELLER_STORE_SLUG;
  const workspaceStorefrontName = options.storefrontName ?? "Avin E2E Store";
  const existingProfile = await db.query.sellerProfile.findFirst({
    where: eq(sellerProfile.userId, sellerUserId),
  });

  let sellerProfileId = existingProfile?.id;

  if (existingProfile) {
    await db
      .update(sellerProfile)
      .set({
        avatarUrl: "https://example.com/avin-e2e-seller-avatar.png",
        bio: "Tài khoản seller dùng cho kiểm thử E2E.",
        phone: "0900000000",
        phoneVerified: true,
        storeSlug: existingProfile.storeSlug || workspaceStoreSlug,
        storefrontName:
          existingProfile.storefrontName || workspaceStorefrontName,
      })
      .where(eq(sellerProfile.id, existingProfile.id));
  } else {
    const [createdProfile] = await db
      .insert(sellerProfile)
      .values({
        avatarUrl: "https://example.com/avin-e2e-seller-avatar.png",
        bio: "Tài khoản seller dùng cho kiểm thử E2E.",
        phone: "0900000000",
        phoneVerified: true,
        storeSlug: workspaceStoreSlug,
        storefrontName: workspaceStorefrontName,
        userId: sellerUserId,
      })
      .returning({ id: sellerProfile.id });
    sellerProfileId = createdProfile?.id;
  }

  if (!sellerProfileId) {
    throw new Error(
      `Unable to provision a seller profile for ${sellerUserId}.`
    );
  }

  const existingApplication = await db.query.sellerApplication.findFirst({
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    where: eq(sellerApplication.userId, sellerUserId),
  });

  const applicationValues = {
    applicantName: workspaceApplicantName,
    bankAccount: {
      accountName: "AVIN E2E",
      accountNumber: "0000000000",
      bankName: "Vietcombank",
    },
    email: workspaceEmail,
    phone: "0900000000",
    reviewReason: null,
    sellerAgreementAcceptedAt: new Date(),
    sellerAgreementVersion: SELLER_AGREEMENT_VERSION,
    sellerProfileId,
    status: "APPROVED" as const,
    storefrontName: workspaceStorefrontName,
  };

  await (existingApplication
    ? db
        .update(sellerApplication)
        .set(applicationValues)
        .where(eq(sellerApplication.id, existingApplication.id))
    : db.insert(sellerApplication).values({
        ...applicationValues,
        userId: sellerUserId,
      }));

  await db
    .update(user)
    .set({ emailVerified: true, hasSeenSellerOnboarding: true })
    .where(eq(user.id, sellerUserId));
};

const storefrontAccount = await ensureUser({
  email: storefrontEmail,
  name: "Avin E2E Buyer",
  password: storefrontPassword,
  role: "BUYER",
});

const sellerAccount = await ensureUser({
  email: sellerEmail,
  name: "Avin E2E Seller",
  password: sellerPassword,
  role: "SELLER",
});
await ensureSellerWorkspace(sellerAccount.user.id);

const enforcementSellerAccount = await ensureUser({
  email: enforcementSellerEmail,
  name: "Avin E2E Enforcement Seller",
  password: enforcementSellerPassword,
  role: "SELLER",
});
await ensureSellerWorkspace(enforcementSellerAccount.user.id, {
  applicantName: "Avin E2E Enforcement Seller",
  email: enforcementSellerEmail,
  storeSlug: enforcementSellerStoreSlug,
  storefrontName: "Avin E2E Enforcement Store",
});

const onboardingSellerAccount = await ensureUser({
  email: onboardingSellerEmail,
  name: "Avin E2E Onboarding Seller",
  password: onboardingSellerPassword,
  role: "SELLER",
});

const providerAccount = await ensureUser({
  email: providerEmail,
  name: "Avin E2E Provider",
  password: providerPassword,
  role: "BUYER",
});

await auth.api.signInEmail({
  body: {
    email: storefrontEmail,
    password: storefrontPassword,
  },
  headers: createAuthRequestHeaders(),
});

const adminAccount = await ensureUser({
  email: adminEmail,
  name: "Avin E2E Admin",
  password: adminPassword,
  role: "ADMIN",
});

await db
  .insert(protectionAdminAssignment)
  .values({ capability: "SUPER_ADMIN", userId: adminAccount.user.id })
  .onConflictDoNothing();

const signInAdmin = async (): Promise<string> => {
  const result = await adminAuth.api.signInEmail({
    body: {
      email: adminEmail,
      password: adminPassword,
    },
    headers: createAuthRequestHeaders(),
    returnHeaders: true,
  });

  return getCookieHeader(result.headers);
};

let totpSecret = localEnvironment.E2E_ADMIN_TOTP_SECRET;
let currentAdmin = await findUserByEmail(adminEmail);

if (!currentAdmin) {
  throw new Error("The E2E Admin account was not created.");
}

if (!currentAdmin.twoFactorEnabled) {
  const cookieHeader = await signInAdmin();
  const sessionHeaders = createAuthRequestHeaders(cookieHeader);

  if (!totpSecret) {
    const setup = await adminAuth.api.enableTwoFactor({
      body: { password: adminPassword },
      headers: sessionHeaders,
    });
    totpSecret = extractTotpSecret(setup.totpURI);
    localEnvironment.E2E_ADMIN_TOTP_SECRET = totpSecret;
    await persistLocalEnvironment(localEnvironment);
  }

  await adminAuth.api.verifyTOTP({
    body: { code: generateTotpCode(totpSecret), trustDevice: true },
    headers: sessionHeaders,
  });
  currentAdmin = await findUserByEmail(adminEmail);
}

if (!(currentAdmin?.twoFactorEnabled && totpSecret)) {
  throw new Error("The E2E Admin account does not have verified 2FA.");
}

if (!adminAccount.created) {
  const twoFactorCookie = await signInAdmin();
  await adminAuth.api.verifyTOTP({
    body: { code: generateTotpCode(totpSecret), trustDevice: true },
    headers: createAuthRequestHeaders(twoFactorCookie),
  });
}

process.stdout.write(
  `${[
    `Storefront account: ${storefrontEmail} (${storefrontAccount.created ? "created" : "reused"})`,
    `Seller account: ${sellerEmail} (${sellerAccount.created ? "created" : "reused"}, approved workspace)`,
    `Onboarding Seller account: ${onboardingSellerEmail} (${onboardingSellerAccount.created ? "created" : "reused"}, fresh application fixture)`,
    `Enforcement Seller account: ${enforcementSellerEmail} (${enforcementSellerAccount.created ? "created" : "reused"}, approved workspace)`,
    `Provider account: ${providerEmail} (${providerAccount.created ? "created" : "reused"})`,
    `Admin account: ${adminEmail} (${adminAccount.created ? "created" : "reused"}, 2FA verified)`,
    "Credentials saved to e2e/.env.local.",
  ].join("\n")}\n`
);
