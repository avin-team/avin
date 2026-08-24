// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
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

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../api/provider-api", () => ({
  useProviderApplicationActions: () => ({
    createDepositIntent: { isPending: false, mutateAsync: vi.fn() },
    saveDraft: { isPending: false, mutateAsync: mockSaveDraft },
    submit: { isPending: false, mutateAsync: mockSubmit },
  }),
  useProviderDepositIntent: () => ({ data: null, isPending: false }),
  useProviderProfileRevisionActions: () => ({
    saveDraft: { isPending: false, mutateAsync: vi.fn() },
    start: { isPending: false, mutateAsync: vi.fn() },
    submit: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

describe("ProviderApplicationForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the registration steps and identity fields", () => {
    render(<ProviderApplicationForm application={null} />);

    expect(
      screen.getByRole("tab", { name: "1. Thông tin & liên hệ" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "2. Bond & cam kết" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Đăng ký đối tác" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Địa điểm hoạt động *")).toBeInTheDocument();
  });

  it("updates live preview when user types their name", () => {
    render(<ProviderApplicationForm application={null} />);

    const nameInput = screen.getByLabelText(/Họ và tên/iu);
    fireEvent.change(nameInput, { target: { value: "Nguyễn Văn Bảo" } });

    expect(nameInput).toHaveValue("Nguyễn Văn Bảo");
  });

  it("pre-populates the default services draft template into the textarea", () => {
    render(<ProviderApplicationForm application={null} />);

    const servicesInput = screen.getByLabelText(
      /Dịch vụ cung cấp/iu
    ) as HTMLTextAreaElement;
    expect(servicesInput.value).toContain("Dịch vụ cung cấp của tôi");
  });

  it("links the policy commitment to the published partner policy", () => {
    render(<ProviderApplicationForm application={null} />);

    fireEvent.click(screen.getByRole("tab", { name: "2. Bond & cam kết" }));

    expect(
      screen.getByRole("link", {
        name: /Quy chế Hoạt động Đối tác Avin Check/iu,
      })
    ).toHaveAttribute("href", "/avin-check/partner-policy");
  });
});
