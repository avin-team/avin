import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderDirectoryPage } from "./provider-directory-page";

vi.mock("@/utils/orpc", () => ({
  orpc: {
    protection: {
      providerDirectory: {
        list: { queryOptions: () => ({ queryKey: ["provider-directory"] }) },
      },
    },
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      providers: [
        {
          displayName: "Provider One",
          id: "profile-1",
          officialChannels: {
            facebookUrl: "https://facebook.com/provider-one",
          },
          profileSlug: "provider-one",
          publicUrl: "/avin-check/provider/provider-one",
          publishedAt: "2026-01-01T00:00:00.000Z",
          services: "Thiết kế nhận diện thương hiệu",
          status: "ACTIVE",
          verifiedAt: "2026-01-01T00:00:00.000Z",
          versionNumber: 1,
        },
      ],
    },
    isError: false,
    isPending: false,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    [key: string]: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe("ProviderDirectoryPage", () => {
  afterEach(cleanup);

  it("renders active profiles and keeps the search field out of autocomplete", () => {
    render(<ProviderDirectoryPage />);

    expect(
      screen.getByRole("heading", {
        name: "Tìm đối tác đã xác minh",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Provider One")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem hồ sơ" })).toHaveAttribute(
      "href",
      "/avin-check/provider/provider-one"
    );
    expect(
      screen.getByRole("link", { name: "Đăng ký đối tác" })
    ).toHaveAttribute("href", "/avin-check/apply");
    expect(screen.getByRole("textbox")).toHaveAttribute("autocomplete", "off");
  });

  it("searches by partner name instantly on the frontend", () => {
    render(<ProviderDirectoryPage />);

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "Provider" } });

    expect(screen.getByText("Provider One")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem hồ sơ" })).toHaveAttribute(
      "href",
      "/avin-check/provider/provider-one"
    );
    expect(document.title).not.toContain("Provider");
  });

  it("clears search keyword and resets state when clear button is clicked", () => {
    render(<ProviderDirectoryPage />);

    const searchInput = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "Nonexistent" } });
    expect(searchInput.value).toBe("Nonexistent");
    expect(screen.queryByText("Provider One")).not.toBeInTheDocument();

    const clearButton = screen.getByRole("button", {
      name: "Xóa từ khóa tìm kiếm",
    });
    fireEvent.click(clearButton);

    expect(searchInput.value).toBe("");
    expect(screen.getByText("Provider One")).toBeInTheDocument();
  });
});
