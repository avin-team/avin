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
      screen.getByRole("tab", { name: "1. Thông tin cá nhân" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("2. Tài khoản đối soát & Cam kết")
    ).toBeInTheDocument();
    expect(screen.getByText("Avin Check Certified")).toBeInTheDocument();
    expect(
      screen.getByText("Xem trước giao diện công khai")
    ).toBeInTheDocument();
  });

  it("updates live preview when user types their name", () => {
    render(<ProviderApplicationForm application={null} />);

    const nameInput = screen.getByLabelText(/Họ và tên \(chính chủ\)/iu);
    fireEvent.change(nameInput, { target: { value: "Nguyễn Văn Bảo" } });

    expect(
      screen.getByRole("heading", { name: "Nguyễn Văn Bảo" })
    ).toBeInTheDocument();
  });

  it("pre-populates the default services draft template into the textarea", () => {
    render(<ProviderApplicationForm application={null} />);

    const servicesInput = screen.getByLabelText(
      /Dịch vụ cung cấp/iu
    ) as HTMLTextAreaElement;
    expect(servicesInput.value).toContain("Dịch Vụ Mạng Xã Hội");
  });
});
