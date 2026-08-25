import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicRiskWarningDetailPage } from "./public-risk-warning-detail-page";

const queryState = {
  data: undefined as unknown,
  isError: false,
  isPending: false,
};

vi.mock("@/utils/orpc", () => ({
  orpc: {
    protection: {
      publicRiskWarnings: {
        get: {
          queryOptions: () => ({ queryKey: ["public-risk-warning"] }),
        },
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
    search,
    to,
    ...props
  }: {
    children: ReactNode;
    search?: { reportId?: string };
    to: string;
  }) => (
    <a
      href={search?.reportId ? `${to}?reportId=${search.reportId}` : to}
      {...props}
    >
      {children}
    </a>
  ),
  useParams: () => ({ slug: "scam-slug-1" }),
}));

const mockWarningData = {
  claimedLoss: 850_000,
  evidence: [
    {
      contentType: "image/png",
      id: "evidence-1",
      kind: "PAYMENT_PROOF",
      publicUrl: "https://cdn.example.com/public-evidence.png",
      sizeBytes: 2048,
    },
  ],
  externalSource: {
    bankName: "VIB",
    name: "chongscam",
    sourceCreatedAt: "2026-08-24T22:25:00.000Z",
    sourceStatus: "PUBLISHED",
    sourceUrl: "https://checkscam.vn/report-1",
    suspectName: "Nguyễn Thành T.",
    title: "Cảnh báo lừa đảo tài khoản",
  },
  history: [
    {
      createdAt: "2026-08-24T22:25:00.000Z",
      status: "PUBLISHED",
    },
  ],
  identifiers: [
    {
      maskedValue: "**** 1951",
      publicValue: null,
      type: "BANK_ACCOUNT",
    },
    {
      maskedValue: "**** 0347",
      publicValue: null,
      type: "PHONE",
    },
  ],
  platform: "VIB",
  publicPath: "/avin-check/warning/scam-slug-1",
  publicSlug: "scam-slug-1",
  publicSummary: "Lừa đảo chiếm đoạt tài sản qua giao dịch chuyển khoản.",
  publishedAt: "2026-08-24T22:25:00.000Z",
  reportId: "report-123",
  status: "PUBLISHED",
  supportOutcome: null,
  type: "BANK_WALLET_PHONE",
  violationType: "Chiếm đoạt tiền",
};

describe("PublicRiskWarningDetailPage", () => {
  afterEach(() => {
    cleanup();
    queryState.data = undefined;
    queryState.isError = false;
    queryState.isPending = false;
  });

  it("renders skeleton when query is pending", () => {
    queryState.isPending = true;

    const { container } = render(<PublicRiskWarningDetailPage />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.getByText("Quay lại danh mục cảnh báo")).toBeInTheDocument();
    expect(screen.getByText("Thông tin cảnh báo")).toBeInTheDocument();
  });

  it("renders not found alert when query is errored", () => {
    queryState.isError = true;

    render(<PublicRiskWarningDetailPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Không tìm thấy cảnh báo")).toBeInTheDocument();
  });

  it("renders unified warning card with embedded evidence and metadata", () => {
    queryState.data = mockWarningData;

    render(<PublicRiskWarningDetailPage />);

    expect(screen.getByText("Thông tin cảnh báo")).toBeInTheDocument();
    expect(screen.getAllByText("Nguyễn Thành T.")).toHaveLength(2);
    expect(screen.getByText("**** 1951")).toBeInTheDocument();
    expect(screen.getByText("VIB")).toBeInTheDocument();
    expect(screen.getByText("850.000 VND")).toBeInTheDocument();
    expect(
      screen.getByText("Lừa đảo chiếm đoạt tài sản qua giao dịch chuyển khoản.")
    ).toBeInTheDocument();

    const img = screen.getByAltText("Bằng chứng 1: PAYMENT_PROOF");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      "https://cdn.example.com/public-evidence.png"
    );

    expect(
      screen.getByRole("link", { name: /Yêu cầu đính chính \/ gỡ/iu })
    ).toHaveAttribute("href", "/avin-check/correction?reportId=report-123");
    expect(
      screen.getByRole("link", { name: /Gửi report mới/iu })
    ).toHaveAttribute("href", "/avin-check/report");
  });
});
