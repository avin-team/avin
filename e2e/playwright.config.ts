import { defineConfig, devices } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";
import { config as loadEnvironmentFile } from "dotenv";

import { AUTH_STATE_PATHS } from "./src/support/auth-state";
import {
  resolveAdminTestAccount,
  resolveE2EEnvironment,
  resolveStorefrontTestAccount,
} from "./src/support/environment";

loadEnvironmentFile({
  path: new URL(".env.local", import.meta.url),
  quiet: true,
});

const environment = resolveE2EEnvironment();
const storefrontAccount = environment.isProduction
  ? null
  : resolveStorefrontTestAccount();
const adminAccount = environment.isProduction
  ? null
  : resolveAdminTestAccount();
const isCI = Boolean(process.env.CI);
const EMPTY_STORAGE_STATE = { cookies: [], origins: [] };

const getRetryCount = (): number => {
  if (isCI) {
    return 2;
  }

  return environment.isProduction ? 1 : 0;
};

const getWorkerCount = (): number | "50%" | undefined => {
  if (environment.isProduction) {
    return 1;
  }

  return isCI ? "50%" : undefined;
};

const projects: NonNullable<PlaywrightTestConfig["projects"]> = [
  {
    name: "web-anonymous",
    testDir: "./src/tests/web",
    testIgnore: /.*\.authenticated\.spec\.ts/u,
    use: {
      ...devices["Desktop Chrome"],
      baseURL: environment.webBaseURL,
      storageState: EMPTY_STORAGE_STATE,
    },
  },
];

if (storefrontAccount && !environment.isProduction) {
  projects.push(
    {
      name: "storefront-auth-setup",
      testDir: "./src/setup",
      testMatch: /storefront\.setup\.ts/u,
      use: {
        baseURL: environment.apiBaseURL,
        extraHTTPHeaders: { origin: environment.webBaseURL },
      },
    },
    {
      dependencies: ["storefront-auth-setup"],
      name: "web-authenticated",
      testDir: "./src/tests/web",
      testMatch: /.*\.authenticated\.spec\.ts/u,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: environment.webBaseURL,
        storageState: AUTH_STATE_PATHS.storefront,
      },
    }
  );
}

if (environment.adminBaseURL) {
  projects.push({
    name: "admin-anonymous",
    testDir: "./src/tests/admin",
    testIgnore: /.*\.authenticated\.spec\.ts/u,
    use: {
      ...devices["Desktop Chrome"],
      baseURL: environment.adminBaseURL,
      storageState: EMPTY_STORAGE_STATE,
    },
  });
}

if (adminAccount && environment.adminBaseURL && !environment.isProduction) {
  projects.push(
    {
      name: "admin-auth-setup",
      testDir: "./src/setup",
      testMatch: /admin\.setup\.ts/u,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: environment.adminBaseURL,
      },
    },
    {
      dependencies: ["admin-auth-setup"],
      name: "admin-authenticated",
      testDir: "./src/tests/admin",
      testMatch: /.*\.authenticated\.spec\.ts/u,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: environment.adminBaseURL,
        storageState: AUTH_STATE_PATHS.admin,
      },
    }
  );
}

const webServer: NonNullable<PlaywrightTestConfig["webServer"]> = [];

if (environment.shouldStartLocalApiServer) {
  webServer.push({
    command: "bun run --cwd ../apps/server dev",
    reuseExistingServer: !isCI,
    timeout: 120_000,
    url: environment.apiBaseURL,
  });
}

if (environment.shouldStartLocalWebServer) {
  webServer.push({
    command: "bun run --cwd ../apps/web dev --host localhost --strictPort",
    reuseExistingServer: !isCI,
    timeout: 120_000,
    url: environment.webBaseURL,
  });
}

if (environment.shouldStartLocalAdminServer && environment.adminBaseURL) {
  webServer.push({
    command: "bun run --cwd ../apps/admin dev --host localhost --strictPort",
    reuseExistingServer: !isCI,
    timeout: 120_000,
    url: environment.adminBaseURL,
  });
}

export default defineConfig({
  expect: {
    timeout: 5000,
  },
  forbidOnly: isCI,
  fullyParallel: true,
  grep: environment.isProduction ? /@prod-safe/u : undefined,
  outputDir: "test-results",
  projects,
  reporter: [
    ["list"],
    [
      "html",
      {
        open: isCI ? "never" : "on-failure",
        outputFolder: "playwright-report",
      },
    ],
  ],
  retries: getRetryCount(),
  timeout: 30_000,
  use: {
    actionTimeout: 10_000,
    locale: "vi-VN",
    navigationTimeout: 20_000,
    screenshot: "only-on-failure",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: isCI ? "on-first-retry" : "retain-on-failure",
    video: isCI ? "retain-on-failure" : "off",
  },
  webServer: webServer.length > 0 ? webServer : undefined,
  workers: getWorkerCount(),
});
