import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AvinCheckPageHeader } from "./avin-check-page-header";

describe("AvinCheckPageHeader", () => {
  afterEach(cleanup);

  it("renders badge, title, description, and actions through public slots", () => {
    render(
      <AvinCheckPageHeader
        actions={<button type="button">Quay lại</button>}
        badge="Avin Cảnh báo · Đính chính"
        description="Mô tả thông tin yêu cầu đính chính"
        title="Yêu cầu đính chính cảnh báo"
      />
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Yêu cầu đính chính cảnh báo",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Avin Cảnh báo · Đính chính")).toBeInTheDocument();
    expect(
      screen.getByText("Mô tả thông tin yêu cầu đính chính")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Quay lại" })
    ).toBeInTheDocument();
  });

  it("coordinates accessible labelling between section and heading id", () => {
    const { container } = render(
      <AvinCheckPageHeader headingId="custom-heading-id" title="Tiêu đề mẫu" />
    );

    const section = container.querySelector("section");
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Tiêu đề mẫu",
    });

    expect(section).toHaveAttribute("aria-labelledby", "custom-heading-id");
    expect(heading).toHaveAttribute("id", "custom-heading-id");
  });

  it("supports customizable heading level and children rendered in content slot", () => {
    render(
      <AvinCheckPageHeader headingAs="h2" title="Tiêu đề cấp 2">
        <form data-testid="search-form">
          <input placeholder="Tìm kiếm..." />
        </form>
      </AvinCheckPageHeader>
    );

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Tiêu đề cấp 2",
      })
    ).toBeInTheDocument();
    expect(screen.getByTestId("search-form")).toBeInTheDocument();
  });
});
