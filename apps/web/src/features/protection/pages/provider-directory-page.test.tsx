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

describe("ProviderDirectoryPage", () => {
  afterEach(() => {
    cleanup();
    mocks.mutateAsync.mockReset();
  });

  it("renders active profiles and keeps the search field out of autocomplete", () => {
    render(<ProviderDirectoryPage />);

    expect(
      screen.getByRole("heading", {
        name: "Tìm Đối tác Avin đã được xem xét.",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Provider One")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Xem profile ổn định" })
    ).toHaveAttribute("href", "/avin-check/provider/provider-one");
    expect(screen.getByRole("textbox")).toHaveAttribute("autocomplete", "off");
  });

  it("submits exact search as a mutation without putting it in navigation", async () => {
    render(<ProviderDirectoryPage />);

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "123456789" } });
    fireEvent.click(screen.getByRole("button", { name: "Tìm chính xác" }));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({ query: "123456789" });
    });
    expect(
      screen.getByRole("link", { name: "Xem profile ổn định" })
    ).toHaveAttribute("href", "/avin-check/provider/provider-one");
    expect(document.title).not.toContain("123456789");
  });
});
