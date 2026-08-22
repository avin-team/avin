// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderApplicationForm } from "./provider-application-form";

const mockSaveDraft = vi.fn();
const mockSubmit = vi.fn();

vi.mock("@better-upload/client", () => ({
  useUploadFile: () => ({
    isPending: false,
    progress: 0,
    reset: vi.fn(),
    uploadAsync: vi.fn(),
  }),
}));

vi.mock("../api/provider-api", () => ({
  useProviderApplicationActions: () => ({
    saveDraft: { isPending: false, mutateAsync: mockSaveDraft },
    submit: { isPending: false, mutateAsync: mockSubmit },
  }),
  useProviderProfileRevisionActions: () => ({
    saveDraft: { isPending: false, mutateAsync: vi.fn() },
    start: { isPending: false, mutateAsync: vi.fn() },
    submit: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

describe("ProviderApplicationForm with Split Live-Preview", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the 2-step tabs and dual-pane WYSIWYG preview card", () => {
    render(<ProviderApplicationForm application={null} />);

    expect(
      screen.getByRole("heading", { name: "Đăng ký Đối tác Avin Check" })
    ).toBeInTheDocument();
    expect(screen.getByText("1. Thông tin & Kênh liên hệ")).toBeInTheDocument();
    expect(
      screen.getByText("2. Đối soát & Cam kết điều khoản")
    ).toBeInTheDocument();
    expect(screen.getByText("Avin Check Certified")).toBeInTheDocument();
    expect(screen.getByText("Xem trước công khai")).toBeInTheDocument();
  });

  it("updates live preview when user types their name", () => {
    render(<ProviderApplicationForm application={null} />);

    const nameInput = screen.getByLabelText(/Họ và tên pháp lý/iu);
    fireEvent.change(nameInput, { target: { value: "Nguyễn Văn Bảo" } });

    expect(
      screen.getByRole("heading", { name: "Nguyễn Văn Bảo" })
    ).toBeInTheDocument();
  });

  it("auto-fills demo data when clicking 'Tự động điền dữ liệu mẫu'", () => {
    render(<ProviderApplicationForm application={null} />);

    const fillDemoButton = screen.getByRole("button", {
      name: /Tự động điền dữ liệu mẫu/iu,
    });
    fireEvent.click(fillDemoButton);

    expect(
      screen.getByRole("heading", { name: "NGUYỄN HOÀNG DƯƠNG" })
    ).toBeInTheDocument();
    expect(screen.getByText(/100%/iu)).toBeInTheDocument();
  });
});
