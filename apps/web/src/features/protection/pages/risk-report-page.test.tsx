import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RiskReportPage } from "./risk-report-page";

const mocks = vi.hoisted(() => ({
  addEvidenceMutateAsync: vi.fn(),
  navigate: vi.fn(),
  previewMutateAsync: vi.fn(),
  saveDraftMutateAsync: vi
    .fn()
    .mockResolvedValue({ id: "mock-draft-report-id" }),
  submitMutateAsync: vi.fn(),
  uploadAsync: vi.fn().mockResolvedValue({
    failedFiles: [],
    files: [
      {
        objectInfo: { key: "mock-key" },
        raw: { name: "test-evidence.png", size: 1024, type: "image/png" },
      },
    ],
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a href="/avin-check" {...props}>
      {children}
    </a>
  ),
  useLocation: () => null,
  useNavigate: () => mocks.navigate,
  useSearch: () => ({ reportId: undefined }),
}));

vi.mock("@better-upload/client", () => ({
  useUploadFiles: () => ({
    isPending: false,
    uploadAsync: mocks.uploadAsync,
  }),
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    protection: {
      riskReport: {
        addEvidence: {
          mutationOptions: () => ({
            mutationFn: mocks.addEvidenceMutateAsync,
          }),
        },
        getMine: {
          queryOptions: () => ({
            queryFn: vi.fn().mockResolvedValue([]),
            queryKey: ["riskReport", "getMine"],
          }),
        },
        preview: {
          mutationOptions: () => ({
            mutationFn: mocks.previewMutateAsync,
          }),
        },
        saveDraft: {
          mutationOptions: () => ({
            mutationFn: mocks.saveDraftMutateAsync,
          }),
        },
        submit: {
          mutationOptions: () => ({
            mutationFn: mocks.submitMutateAsync,
          }),
        },
      },
    },
  },
}));

const renderWithQueryClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe("RiskReportPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders 3 simple tabs (Chuyển tiền, Website giả, Acc bị back) and defaults to Chuyển tiền", () => {
    renderWithQueryClient(<RiskReportPage />);

    expect(screen.getByText("Tố cáo lừa đảo & rủi ro")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /chuyển tiền/iu })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /website giả/iu })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /acc bị back/iu })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/tên chủ tài khoản/iu)).toBeInTheDocument();
    expect(screen.getByLabelText(/số tài khoản/iu)).toBeInTheDocument();
    expect(screen.getByLabelText(/ngân hàng/iu)).toBeInTheDocument();
    expect(screen.getByLabelText(/số tiền chiếm đoạt/iu)).toBeInTheDocument();
  });

  it("switches to Website giả tab and displays appropriate fields", async () => {
    renderWithQueryClient(<RiskReportPage />);

    const webTab = screen.getByRole("tab", { name: /website giả/iu });
    fireEvent.click(webTab);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/link website \/ app \/ profile giả mạo/iu)
      ).toBeInTheDocument();
    });
  });

  it("switches to Acc bị back tab and displays platform and account ID fields", async () => {
    renderWithQueryClient(<RiskReportPage />);

    const accTab = screen.getByRole("tab", { name: /acc bị back/iu });
    fireEvent.click(accTab);

    await waitFor(() => {
      expect(screen.getByLabelText(/nền tảng/iu)).toBeInTheDocument();
      expect(screen.getByLabelText(/id, tài khoản/iu)).toBeInTheDocument();
    });
  });

  it("validates required fields before submitting transaction report", async () => {
    renderWithQueryClient(<RiskReportPage />);

    const submitBtn = screen.getByRole("button", {
      name: /gửi duyệt tố cáo/iu,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/vui lòng nhập tên chủ tài khoản/iu)
      ).toBeInTheDocument();
    });
  });
});
