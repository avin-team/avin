import { readFile } from "node:fs/promises";

import { test as base, expect } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";

import { resolveE2EEnvironment } from "../support/environment";

const LISTING_IMAGE_URL = new URL(
  "../../../apps/web/public/images/seed-listings/youtube-services.png",
  import.meta.url
);
const DRAFT_URL_PATTERN = /\/seller\/listings\/(?!new(?:$|\/))[0-9a-f-]+$/u;

const { apiBaseURL } = resolveE2EEnvironment();

// ---------------------------------------------------------------------------
// Stateless helpers — pure functions, no side effects
// ---------------------------------------------------------------------------

export const getUniqueListingTitle = (
  kind: string,
  testInfo: TestInfo
): string =>
  `E2E ${kind} ${Date.now()}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}`;

export const selectFirstCategory = async (page: Page): Promise<void> => {
  const parentCategory = page.getByLabel("Nhóm danh mục", { exact: true });
  await parentCategory.click();
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.getByRole("option").first().click();

  const subCategory = page.getByLabel("Danh mục con", { exact: true });
  await expect(subCategory).toBeEnabled();
  await subCategory.click();
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.getByRole("option").first().click();
};

export const openNewListing = async (page: Page): Promise<void> => {
  await page.goto("/seller/store?section=products");
  const addProductButton = page.getByRole("button", {
    exact: true,
    name: "Thêm sản phẩm",
  });
  await expect(addProductButton).toBeVisible();
  await addProductButton.click();
  await expect(page).toHaveURL(/\/seller\/listings\/new$/u);
  await expect(
    page.getByRole("heading", { level: 1, name: "Sản phẩm mới" })
  ).toBeVisible();
};

export const fillCourseBasics = async (
  page: Page,
  title: string,
  description: string
): Promise<void> => {
  await page.getByLabel("Tên sản phẩm", { exact: true }).fill(title);
  await page.getByRole("button", { name: /^Khóa học/u }).click();
  await selectFirstCategory(page);
  await page.getByLabel("Mô tả", { exact: true }).fill(description);
  await page.getByLabel("Giá bán (VND)", { exact: true }).fill("250000");
  await page
    .getByLabel("Thời gian hoàn thành (giờ)", { exact: true })
    .fill("72");
};

export const fillServiceBasics = async (
  page: Page,
  title: string,
  description: string
): Promise<void> => {
  await page.getByLabel("Tên sản phẩm", { exact: true }).fill(title);
  await page.getByRole("button", { name: /^Dịch vụ/u }).click();
  await selectFirstCategory(page);
  await page.getByLabel("Mô tả", { exact: true }).fill(description);
};

export const createDraftFromBasics = async (page: Page): Promise<string> => {
  const nextButton = page.getByRole("button", {
    exact: true,
    name: "Tiếp theo",
  });
  await expect(nextButton).toBeEnabled();
  await nextButton.click();
  await expect(page).toHaveURL(DRAFT_URL_PATTERN);

  const listingId = new URL(page.url()).pathname.split("/").at(-1);
  if (!listingId || listingId === "new") {
    throw new Error(`Unable to determine the listing id from ${page.url()}.`);
  }

  return listingId;
};

export const expectActiveStep = async (
  page: Page,
  label: string
): Promise<void> => {
  await expect(page.getByText(label, { exact: true }).last()).toBeVisible();
};

export const uploadListingImage = async (page: Page): Promise<void> => {
  const imageBuffer = await readFile(LISTING_IMAGE_URL);
  const uploadInput = page.getByLabel("Chọn ảnh sản phẩm", { exact: true });
  const uploadResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/upload") &&
      response.request().method() === "POST"
  );

  await uploadInput.setInputFiles({
    buffer: imageBuffer,
    mimeType: "image/png",
    name: "listing-cover.png",
  });
  const response = await uploadResponse;
  expect(response.ok()).toBe(true);
  await expect(
    page.getByRole("img", { name: /Ảnh sản phẩm 1/u })
  ).toBeVisible();
};

export const getWarrantyMinimum = async (page: Page): Promise<number> => {
  const hint = page.getByText(/Phải nằm trong khoảng/u).last();
  await expect(hint).toBeVisible();
  const hintText = await hint.textContent();
  const minimum = hintText?.match(/khoảng\s+(?<hours>\d+)\s+đến/u)?.groups
    ?.hours;

  if (!minimum) {
    throw new Error(
      `Unable to read the category warranty bounds from "${hintText}".`
    );
  }

  return Number(minimum);
};

export const publishAndAssertListing = async (
  page: Page,
  title: string
): Promise<void> => {
  const publishButton = page
    .getByRole("button", {
      exact: true,
      name: "Đăng bán sản phẩm",
    })
    .last();
  await expect(publishButton).toBeEnabled();
  const publishResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/rpc/listing/sellerWorkspace/publish") &&
      response.request().method() === "POST"
  );

  await publishButton.click();
  const response = await publishResponse;
  expect(response.ok()).toBe(true);
  await expect(page).toHaveURL(/\/seller\/store\?section=products$/u);
  await expect(
    page.getByText("Sản phẩm đã được đăng bán.", { exact: true })
  ).toBeVisible();

  const listingRow = page.locator("li").filter({ hasText: title });
  await expect(listingRow).toBeVisible();
  await expect(listingRow.getByText("Đang bán", { exact: true })).toBeVisible();
};

const cleanupListing = async (page: Page, listingId: string): Promise<void> => {
  const deleteResponse = await page.request.post(
    `${apiBaseURL}/rpc/listing/sellerWorkspace/delete`,
    { data: { json: { id: listingId } } }
  );

  if (deleteResponse.ok()) {
    return;
  }

  const deleteDraftResponse = await page.request.post(
    `${apiBaseURL}/rpc/listing/sellerWorkspace/deleteDraft`,
    { data: { json: { id: listingId } } }
  );

  if (deleteDraftResponse.ok()) {
    return;
  }

  if (deleteResponse.status() === 404 || deleteDraftResponse.status() === 404) {
    return;
  }

  throw new Error(
    `Unable to clean up E2E listing ${listingId}: HTTP ${deleteResponse.status()} ${await deleteResponse.text()}`
  );
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface SellerFixtures {
  /** Returns a unique listing title for the current test run. */
  uniqueListingTitle: (kind: string) => string;
  /**
   * Register a listing ID for guaranteed cleanup after the test completes,
   * even if the test throws before reaching a `finally` block.
   */
  withListingCleanup: (listingId: string) => void;
}

export const test = base.extend<SellerFixtures>({
  // oxlint-disable-next-line no-empty-pattern -- Playwright fixture API requires object destructuring
  uniqueListingTitle: async ({}, provide, testInfo) => {
    await provide((kind: string) => getUniqueListingTitle(kind, testInfo));
  },

  withListingCleanup: async ({ page }, provide) => {
    const pendingIds: string[] = [];

    await provide((listingId: string) => {
      pendingIds.push(listingId);
    });

    // Teardown: runs after the test body, guaranteed even on failure.
    for (const id of pendingIds) {
      await cleanupListing(page, id);
    }
  },
});

export { expect } from "@playwright/test";
