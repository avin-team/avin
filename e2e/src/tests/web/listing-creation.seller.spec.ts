import {
  createDraftFromBasics,
  expect,
  expectActiveStep,
  fillCourseBasics,
  fillServiceBasics,
  getWarrantyMinimum,
  openNewListing,
  publishAndAssertListing,
  test,
  uploadListingImage,
} from "../../fixtures/seller.fixture";

test.describe(
  "seller listing creation",
  { tag: ["@seller", "@critical"] },
  () => {
    test("creates and publishes a course listing", async ({
      page,
      uniqueListingTitle,
      withListingCleanup,
    }) => {
      const title = uniqueListingTitle("course");
      let listingId: string;

      await test.step("complete course basics", async () => {
        await openNewListing(page);
        await fillCourseBasics(
          page,
          title,
          "Khóa học E2E kiểm tra luồng tạo sản phẩm và đăng bán."
        );
      });

      await test.step("save the new listing draft", async () => {
        listingId = await createDraftFromBasics(page);
        withListingCleanup(listingId);
        await expectActiveStep(page, "Hình ảnh");
      });

      await test.step("upload the primary image", async () => {
        await uploadListingImage(page);
        await page
          .getByRole("button", { exact: true, name: "Tiếp theo" })
          .click();
        await expectActiveStep(page, "Bảo hành");
      });

      await test.step("complete warranty and publish", async () => {
        const minimumWarrantyHours = await getWarrantyMinimum(page);
        await page
          .getByLabel("Thời hạn (giờ)", { exact: true })
          .fill(String(minimumWarrantyHours));
        await page
          .getByLabel("Điều khoản bảo hành", { exact: true })
          .fill("Hỗ trợ học viên trong thời hạn bảo hành của danh mục.");
        await publishAndAssertListing(page, title);
      });
    });

    test("creates and publishes a service listing with a package", async ({
      page,
      uniqueListingTitle,
      withListingCleanup,
    }) => {
      const title = uniqueListingTitle("service");
      const packageName = `${title} package`;
      let listingId: string;

      await test.step("complete service basics", async () => {
        await openNewListing(page);
        await fillServiceBasics(
          page,
          title,
          "Dịch vụ E2E kiểm tra luồng tạo gói giá và đăng bán sản phẩm."
        );
      });

      await test.step("save the new listing draft", async () => {
        listingId = await createDraftFromBasics(page);
        withListingCleanup(listingId);
        await expectActiveStep(page, "Gói giá");
      });

      await test.step("add a service package", async () => {
        await page
          .getByRole("button", { exact: true, name: "Thêm gói giá" })
          .click();

        // Fill package name
        await page.getByLabel("Tên gói", { exact: true }).fill(packageName);

        // Open the description popover via its dedicated test hook.
        await page.getByTestId("package-description-trigger").click();
        await page
          .getByRole("dialog", { name: "Mô tả gói dịch vụ" })
          .getByRole("textbox", { name: "Mô tả gói dịch vụ" })
          .fill("Bàn giao đầy đủ theo phạm vi đã thống nhất.");

        // Close the popover, then fill remaining fields
        await page.keyboard.press("Escape");

        await page
          .getByLabel("Giá VND", { exact: true })
          .getByRole("textbox")
          .fill("150000");
        await page
          .getByLabel("Thời gian xử lý (giờ)", { exact: true })
          .getByRole("textbox")
          .fill("48");
        await page
          .getByRole("button", { exact: true, name: "Lưu gói" })
          .click();
        await expect(
          page.getByText(packageName, { exact: true })
        ).toBeVisible();
      });

      await test.step("upload the primary image and publish", async () => {
        await page
          .getByRole("button", { exact: true, name: "Tiếp theo" })
          .click();
        await expectActiveStep(page, "Hình ảnh");
        await uploadListingImage(page);
        await publishAndAssertListing(page, title);
      });
    });
  }
);
