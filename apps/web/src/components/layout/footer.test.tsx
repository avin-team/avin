import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Footer } from "./footer";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

describe("Footer", () => {
  afterEach(cleanup);

  it("renders the animated flare logo and brand info", () => {
    render(<Footer />);

    expect(screen.getByLabelText("Avin Flare Logo")).toBeInTheDocument();
    expect(screen.getByText("Avin")).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `© ${new Date().getFullYear()} Avin. Đã đăng ký bản quyền.`,
          "u"
        )
      )
    ).toBeInTheDocument();
  });

  it("renders social links", () => {
    render(<Footer />);

    expect(screen.getByLabelText("Facebook")).toBeInTheDocument();
    expect(screen.getByLabelText("TikTok")).toBeInTheDocument();
    expect(screen.getByLabelText("YouTube")).toBeInTheDocument();
  });

  it("renders navigation columns and categories", () => {
    render(<Footer />);

    expect(screen.getByText("Dịch vụ số")).toBeInTheDocument();
    expect(screen.getByText("Avin Check")).toBeInTheDocument();
    expect(screen.getByText("Chính sách")).toBeInTheDocument();
    expect(screen.getByText("Tra cứu rủi ro")).toBeInTheDocument();
    expect(screen.getByText("Báo cáo lừa đảo")).toBeInTheDocument();
    expect(screen.getByText("Khám phá dịch vụ")).toBeInTheDocument();
  });
});
