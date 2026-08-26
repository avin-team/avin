import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ShowcaseProvider } from "./provider-showcase-section";
import { ProviderShowcaseSection } from "./provider-showcase-section";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    to,
    ...props
  }: {
    children: React.ReactNode;
    params?: { slug: string };
    to: string;
    [key: string]: unknown;
  }) => {
    const href = params?.slug ? to.replace("$slug", params.slug) : to;
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

const sampleProviders: ShowcaseProvider[] = [
  {
    avatarUrl: "https://example.com/avatar1.jpg",
    displayName: "Nguyễn Minh Khang",
    id: "gdv-1",
    isVerified: true,
    location: "Hà Nội",
    officialChannels: {},
    rank: 1,
    recognizedBondAmount: 50_000_000,
    recommendedTransactionLimit: 20_000_000,
    services: "Dịch vụ 1",
    slug: "nguyen-minh-khang",
    tier: "BRONZE",
    verifiedAt: "2024-03-15",
  },
  {
    avatarUrl: "https://example.com/avatar2.jpg",
    displayName: "Hoàng Anh Tú",
    id: "gdv-4",
    isVerified: true,
    location: "Hà Nội",
    officialChannels: {},
    rank: 4,
    recognizedBondAmount: 500_000_000,
    recommendedTransactionLimit: 250_000_000,
    services: "Dịch vụ 4",
    slug: "hoang-anh-tu",
    tier: "DIAMOND",
    verifiedAt: "2023-11-20",
  },
  {
    avatarUrl: "https://example.com/avatar3.jpg",
    displayName: "Lê Kim Linh",
    id: "gdv-11",
    isVerified: true,
    location: "TP. Hồ Chí Minh",
    officialChannels: {},
    rank: 11,
    recognizedBondAmount: 600_000_000,
    recommendedTransactionLimit: 300_000_000,
    services: "Dịch vụ VIP",
    slug: "le-kim-linh",
    tier: "VIP",
    verifiedAt: "2023-10-10",
  },
];

describe("ProviderShowcaseSection", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders skeletons when isLoading is true", () => {
    const { container } = render(<ProviderShowcaseSection isLoading={true} />);

    expect(
      screen.getByRole("heading", { name: "Đối tác đã xác minh" })
    ).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("renders empty state when there are no providers and not loading", () => {
    render(<ProviderShowcaseSection initialProviders={[]} isLoading={false} />);

    expect(
      screen.getByRole("heading", { name: "Đối tác đã xác minh" })
    ).toBeInTheDocument();
    expect(screen.getByText("Chưa có đối tác đã xác minh")).toBeInTheDocument();
  });

  it("renders heading, total partner count, and providers sorted by newest join time by default", () => {
    render(<ProviderShowcaseSection initialProviders={sampleProviders} />);

    expect(
      screen.getByRole("heading", { name: "Đối tác đã xác minh" })
    ).toBeInTheDocument();
    expect(screen.getByText(/3\/3 đối tác/u)).toBeInTheDocument();

    // All 3 providers are rendered
    expect(screen.getByText("1. Nguyễn Minh Khang")).toBeInTheDocument();
    expect(screen.getByText("4. Hoàng Anh Tú")).toBeInTheDocument();
    expect(screen.getByText("11. Lê Kim Linh")).toBeInTheDocument();

    // Select triggers are rendered
    expect(
      screen.getByRole("combobox", { name: "Lọc theo hạng đối tác" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Sắp xếp danh sách đối tác" })
    ).toBeInTheDocument();
  });

  it("renders rank select and sort select with default values", () => {
    render(<ProviderShowcaseSection initialProviders={sampleProviders} />);

    const rankTrigger = screen.getByRole("combobox", {
      name: "Lọc theo hạng đối tác",
    });
    expect(rankTrigger).toHaveTextContent("Tất cả hạng");

    const sortTrigger = screen.getByRole("combobox", {
      name: "Sắp xếp danh sách đối tác",
    });
    expect(sortTrigger).toHaveTextContent("Thời gian: Mới nhất");
  });
});
