import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicRiskWarningListPage } from "./public-risk-warning-list-page";

vi.mock("@/utils/orpc", () => ({
  orpc: {
    protection: {
      publicRiskWarnings: {
        list: {
          queryOptions: () => ({ queryKey: ["public-risk-warnings"] }),
        },
      },
    },
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [
      {
        claimedLoss: 500_000,
        evidence: [
          {
            contentType: "image/png",
            id: "evidence-1",
            kind: "PAYMENT_PROOF",
            publicUrl: "https://cdn.example.com/public-derivative.png",
            sizeBytes: 1024,
          },
        ],
        history: [
          {
            createdAt: "2026-08-21T00:00:00.000Z",
            status: "PUBLISHED",
          },
        ],
        identifiers: [
          {
            maskedValue: "**** 6789",
            publicValue: null,
            type: "BANK_ACCOUNT",
          },
        ],
        publicPath: "/avin-check/warning/warning-report-1",
        publicSlug: "warning-report-1",
        publicSummary: "Nội dung đã được kiểm chứng và che dữ liệu cá nhân.",
        publishedAt: "2026-08-21T00:00:00.000Z",
        status: "PUBLISHED",
        type: "BANK_WALLET_PHONE",
      },
    ],
    isError: false,
    isPending: false,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    to,
    ...props
  }: {
    children: ReactNode;
    params?: { slug?: string };
    to: string;
  }) => (
    <a href={params?.slug ? to.replace("$slug", params.slug) : to} {...props}>
      {children}
    </a>
  ),
}));

describe("PublicRiskWarningListPage", () => {
  afterEach(cleanup);

  it("renders only the public warning projection", () => {
    render(<PublicRiskWarningListPage />);

    expect(
      screen.getByRole("heading", {
        name: "Cảnh báo rủi ro đã được xem xét.",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("**** 6789")).toBeInTheDocument();
    expect(
      screen.getByText("Nội dung đã được kiểm chứng và che dữ liệu cá nhân.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Xem warning/iu })).toHaveAttribute(
      "href",
      "/avin-check/warning/warning-report-1"
    );
    expect(screen.queryByText("reporter@example.com")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/risk-reports\/private/iu)
    ).not.toBeInTheDocument();
  });
});
