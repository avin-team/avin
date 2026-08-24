import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AvinCheckLayout } from "./avin-check-layout";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    [key: string]: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="avin-check-child-route" />,
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname: "/avin-check" }),
}));

describe("AvinCheckLayout", () => {
  afterEach(cleanup);

  it("renders the active child route", () => {
    render(<AvinCheckLayout />);

    expect(screen.getByTestId("avin-check-child-route")).toBeInTheDocument();
  });

  it("renders the main Avin Check destinations and marks the current page", () => {
    render(<AvinCheckLayout />);

    expect(
      screen.getByRole("navigation", { name: "Điều hướng Avin Check" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Check scam" })[0]
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "Đối tác" })[0]).toHaveAttribute(
      "href",
      "/avin-check/directory"
    );
    expect(
      screen.getAllByRole("link", { name: "Gửi báo cáo rủi ro" })[0]
    ).toHaveAttribute("href", "/avin-check/report");
    expect(
      screen.getAllByRole("link", { name: "Hướng dẫn và chính sách" })[0]
    ).toHaveAttribute("href", "/avin-check/guide");
  });
});
