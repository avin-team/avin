import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderPublicProfilePage } from "./provider-public-profile-page";

const queryState = {
  data: undefined as unknown,
  isError: false,
  isPending: false,
};

vi.mock("@/utils/orpc", () => ({
  orpc: {
    protection: {
      publicProfile: {
        queryOptions: () => ({ queryKey: ["public-profile"] }),
      },
    },
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => queryState,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: ReactNode;
    to: string;
    [key: string]: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useParams: () => ({ slug: "nguyen-hoang-duong-gdtg" }),
}));

describe("ProviderPublicProfilePage", () => {
  afterEach(() => {
    cleanup();
    queryState.data = undefined;
    queryState.isError = false;
    queryState.isPending = false;
  });

  it("renders skeleton when profile query is pending", () => {
    queryState.isPending = true;

    const { container } = render(<ProviderPublicProfilePage />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.getByText(/Quay lại/u)).toBeInTheDocument();
    expect(
      screen.getByText("Mã GDV: nguyen-hoang-duong-gdtg")
    ).toBeInTheDocument();
  });

  it("renders not found state when profile is missing or errored", () => {
    queryState.isError = true;

    render(<ProviderPublicProfilePage />);

    expect(
      screen.getByText("Không tìm thấy hồ sơ đối tác")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Xem danh sách đối tác" })
    ).toBeInTheDocument();
  });

  it("renders full profile when data is loaded", () => {
    queryState.data = {
      bio: "Chuyên trung gian uy tín",
      displayName: "Nguyễn Hoàng Dương",
      history: [],
      location: "Hà Nội",
      officialChannels: {
        avatarUrl: "/images/providers/nguyen-hoang-duong-gdtg.jpg",
        hotline: "0934567643",
        zalo: "0934567643",
      },
      profileSlug: "nguyen-hoang-duong-gdtg",
      publishedAt: "2026-01-01T00:00:00.000Z",
      recognizedBondAmount: 12_500_000,
      recommendedTransactionLimit: 10_000_000,
      registeredBankAccounts: [
        {
          accountName: "NGUYEN HOANG DUONG",
          accountNumber: "100005959991439",
          bankCode: "MBBank",
          isPrimary: true,
        },
      ],
      relatedWarnings: [],
      services: "Giao dịch an toàn Game & Social",
      source: "CHECKSCAM",
      status: "ACTIVE",
      tier: "SILVER",
      verifiedAt: "2021-04-01T00:00:00.000Z",
    };

    render(<ProviderPublicProfilePage />);

    expect(
      screen.getByRole("heading", { name: "Nguyễn Hoàng Dương" })
    ).toBeInTheDocument();
    expect(screen.getByText("Nguồn: CheckScam")).toBeInTheDocument();
    expect(screen.getByText("Danh tính đã xác minh")).toBeInTheDocument();
    expect(screen.getByText("12.500.000 đ")).toBeInTheDocument();
    expect(screen.getByText("≤ 10.000.000 đ")).toBeInTheDocument();
    expect(screen.getByText("Kênh liên hệ & Xác minh")).toBeInTheDocument();
    expect(screen.getByText("Giao dịch an toàn")).toBeInTheDocument();
  });
});
