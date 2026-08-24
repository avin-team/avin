import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderDirectoryPage } from "./provider-directory-page";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    protection: {
      providerDirectory: {
        list: { queryOptions: () => ({ queryKey: ["provider-directory"] }) },
        search: { mutationOptions: () => ({}) },
      },
    },
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    data: undefined,
    isError: false,
    isPending: false,
    mutateAsync: mocks.mutateAsync,
  }),
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
  afterEach(() => {
    cleanup();
    mocks.mutateAsync.mockReset();
  });

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

  it("searches by partner name without putting it in navigation", async () => {
    render(<ProviderDirectoryPage />);

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "Provider" } });
    fireEvent.click(screen.getByRole("button", { name: "Tìm đối tác" }));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({ query: "Provider" });
    });
    expect(screen.getByRole("link", { name: "Xem hồ sơ" })).toHaveAttribute(
      "href",
      "/avin-check/provider/provider-one"
    );
    expect(document.title).not.toContain("Provider");
  });
});
