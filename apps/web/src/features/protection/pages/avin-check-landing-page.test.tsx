import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AvinCheckLandingPage } from "./avin-check-landing-page";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe("AvinCheckLandingPage", () => {
  afterEach(cleanup);

  it("explains the bounded product, public labels, and non-guarantee scope", () => {
    render(<AvinCheckLandingPage />);

    expect(
      screen.getByRole("heading", { name: /Avin Check/iu })
    ).toBeInTheDocument();
    expect(screen.getByText("Đối tác Avin")).toBeInTheDocument();
    expect(screen.getByText("Quản lý hệ thống")).toBeInTheDocument();
    expect(
      screen.getByText(
        /xác minh không phải là bảo đảm giao dịch hoặc bảo hiểm tự động/iu
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/pilot không tiền và không ghi nhận Provider Bond/iu)
    ).toBeInTheDocument();
  });

  it("provides an accessible path back to marketplace services", () => {
    render(<AvinCheckLandingPage />);

    expect(
      screen.getByRole("link", { name: "Tiếp tục khám phá dịch vụ Avin" })
    ).toHaveAttribute("href", "/category");
  });

  it("provides a shared Avin account path for Provider applications", () => {
    render(<AvinCheckLandingPage />);

    expect(
      screen.getByRole("link", { name: "Đăng ký Đối tác Avin" })
    ).toHaveAttribute("href", "/avin-check/apply");
  });
});
