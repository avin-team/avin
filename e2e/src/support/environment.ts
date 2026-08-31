const LOCAL_WEB_BASE_URL = "http://localhost:3001";
const LOCAL_ADMIN_BASE_URL = "http://localhost:5174";
const LOCAL_API_BASE_URL = "http://localhost:3000";

type E2ETarget = "local" | "prod";

interface E2EEnvironment {
  adminBaseURL: string | null;
  apiBaseURL: string;
  isProduction: boolean;
  shouldStartLocalAdminServer: boolean;
  shouldStartLocalApiServer: boolean;
  shouldStartLocalWebServer: boolean;
  target: E2ETarget;
  webBaseURL: string;
}

interface PasswordTestAccount {
  email: string;
  password: string;
}

interface AdminTestAccount extends PasswordTestAccount {
  totpSecret: string;
}

const parseTarget = (value: string | undefined): E2ETarget => {
  const target = value?.trim() || "local";

  if (target === "local" || target === "prod") {
    return target;
  }

  throw new Error(
    `Unsupported E2E_TARGET "${target}". Expected "local" or "prod".`
  );
};

const parseBaseURL = ({
  fallback,
  name,
  required,
  target,
  value,
}: {
  fallback?: string;
  name: string;
  required: boolean;
  target: E2ETarget;
  value: string | undefined;
}): string | null => {
  const configuredBaseURL = value?.trim();

  if (required && !configuredBaseURL) {
    throw new Error(
      `${name} is required when E2E_TARGET=prod. Refusing to guess a production URL.`
    );
  }

  const baseURL = configuredBaseURL || fallback;

  if (!baseURL) {
    return null;
  }

  let parsedURL: URL;

  try {
    parsedURL = new URL(baseURL);
  } catch {
    throw new Error(`${name} must be an absolute URL. Received "${baseURL}".`);
  }

  if (target === "prod" && parsedURL.protocol !== "https:") {
    throw new Error(`Production E2E runs require an HTTPS ${name}.`);
  }

  return parsedURL.href.replace(/\/$/u, "");
};

const resolvePasswordAccount = ({
  email,
  emailName,
  password,
  passwordName,
}: {
  email: string | undefined;
  emailName: string;
  password: string | undefined;
  passwordName: string;
}): PasswordTestAccount | null => {
  const normalizedEmail = email?.trim();
  const configuredPassword =
    password && password.length > 0 ? password : undefined;

  if (!(normalizedEmail || configuredPassword)) {
    return null;
  }

  if (!(normalizedEmail && configuredPassword)) {
    throw new Error(
      `${emailName} and ${passwordName} must be configured together.`
    );
  }

  return { email: normalizedEmail, password: configuredPassword };
};

export const resolveStorefrontTestAccount = (): PasswordTestAccount | null =>
  resolvePasswordAccount({
    email: process.env.E2E_USER_EMAIL,
    emailName: "E2E_USER_EMAIL",
    password: process.env.E2E_USER_PASSWORD,
    passwordName: "E2E_USER_PASSWORD",
  });

export const resolveSellerTestAccount = (): PasswordTestAccount | null =>
  resolvePasswordAccount({
    email: process.env.E2E_SELLER_EMAIL,
    emailName: "E2E_SELLER_EMAIL",
    password: process.env.E2E_SELLER_PASSWORD,
    passwordName: "E2E_SELLER_PASSWORD",
  });

export const resolveSellerOnboardingTestAccount =
  (): PasswordTestAccount | null =>
    resolvePasswordAccount({
      email: process.env.E2E_ONBOARDING_SELLER_EMAIL,
      emailName: "E2E_ONBOARDING_SELLER_EMAIL",
      password: process.env.E2E_ONBOARDING_SELLER_PASSWORD,
      passwordName: "E2E_ONBOARDING_SELLER_PASSWORD",
    });

export const resolveSellerEnforcementTestAccount =
  (): PasswordTestAccount | null =>
    resolvePasswordAccount({
      email: process.env.E2E_ENFORCEMENT_SELLER_EMAIL,
      emailName: "E2E_ENFORCEMENT_SELLER_EMAIL",
      password: process.env.E2E_ENFORCEMENT_SELLER_PASSWORD,
      passwordName: "E2E_ENFORCEMENT_SELLER_PASSWORD",
    });

export const resolveProviderTestAccount = (): PasswordTestAccount | null =>
  resolvePasswordAccount({
    email: process.env.E2E_PROVIDER_EMAIL,
    emailName: "E2E_PROVIDER_EMAIL",
    password: process.env.E2E_PROVIDER_PASSWORD,
    passwordName: "E2E_PROVIDER_PASSWORD",
  });

export const resolveSePayTestConfiguration = (): {
  receivingAccountNumber: string;
  secret: string;
} => {
  const receivingAccountNumber = process.env.E2E_SEPAY_BANK_ACCOUNT?.trim();
  const secret = process.env.E2E_SEPAY_WEBHOOK_SECRET?.trim();

  if (!(receivingAccountNumber && secret)) {
    throw new Error(
      "E2E_SEPAY_BANK_ACCOUNT and E2E_SEPAY_WEBHOOK_SECRET are required for Provider payment E2E."
    );
  }

  return { receivingAccountNumber, secret };
};

export const resolveAdminTestAccount = (): AdminTestAccount | null => {
  const passwordAccount = resolvePasswordAccount({
    email: process.env.E2E_ADMIN_EMAIL,
    emailName: "E2E_ADMIN_EMAIL",
    password: process.env.E2E_ADMIN_PASSWORD,
    passwordName: "E2E_ADMIN_PASSWORD",
  });
  const totpSecret = process.env.E2E_ADMIN_TOTP_SECRET?.replaceAll(/\s/gu, "");

  if (!(passwordAccount || totpSecret)) {
    return null;
  }

  if (!(passwordAccount && totpSecret)) {
    throw new Error(
      "E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, and E2E_ADMIN_TOTP_SECRET must be configured together."
    );
  }

  return { ...passwordAccount, totpSecret };
};

export const resolveE2EEnvironment = (): E2EEnvironment => {
  const target = parseTarget(process.env.E2E_TARGET);
  const configuredWebBaseURL = process.env.E2E_BASE_URL?.trim();
  const configuredAdminBaseURL = process.env.E2E_ADMIN_BASE_URL?.trim();
  const configuredApiBaseURL = process.env.E2E_API_BASE_URL?.trim();
  const webBaseURL = parseBaseURL({
    fallback: LOCAL_WEB_BASE_URL,
    name: "E2E_BASE_URL",
    required: target === "prod",
    target,
    value: configuredWebBaseURL,
  });
  const adminBaseURL = parseBaseURL({
    fallback: target === "local" ? LOCAL_ADMIN_BASE_URL : undefined,
    name: "E2E_ADMIN_BASE_URL",
    required: false,
    target,
    value: configuredAdminBaseURL,
  });
  const apiBaseURL = parseBaseURL({
    fallback:
      target === "local" ? LOCAL_API_BASE_URL : (webBaseURL ?? undefined),
    name: "E2E_API_BASE_URL",
    required: false,
    target,
    value: configuredApiBaseURL,
  });

  if (!(webBaseURL && apiBaseURL)) {
    throw new Error("The web and API E2E base URLs must be configured.");
  }

  return {
    adminBaseURL,
    apiBaseURL,
    isProduction: target === "prod",
    shouldStartLocalAdminServer: target === "local" && !configuredAdminBaseURL,
    shouldStartLocalApiServer: target === "local" && !configuredApiBaseURL,
    shouldStartLocalWebServer: target === "local" && !configuredWebBaseURL,
    target,
    webBaseURL,
  };
};
