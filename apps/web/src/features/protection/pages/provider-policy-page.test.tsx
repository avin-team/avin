import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderPolicyPage } from "./provider-policy-page";

vi.mock("@/utils/orpc", () => ({
  orpc: {
    protection: {
      providerPolicy: {
        current: { queryOptions: () => ({ queryKey: ["provider-policy"] }) },
      },
    },
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      effectiveAt: "2026-08-24T00:00:00.000Z",
      membershipFeeAmount: 0,
      minimumBondAmount: 1_000_000,
      summary: "Quy chế dành cho đối tác đã xác minh.",
      terms: "Điều 1. Duy trì thông tin chính xác.",
      title: "Quy chế Hoạt động Đối tác Avin Check",
      version: "v1.0",
    },
    isError: false,
    isPending: false,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe("ProviderPolicyPage", () => {
  afterEach(cleanup);

  it("renders the current public policy and a path back to registration", () => {
    render(<ProviderPolicyPage />);

    expect(
      screen.getByRole("heading", {
        name: "Quy chế Hoạt động Đối tác Avin Check",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Quy chế Đối tác · v1.0")).toBeInTheDocument();
    expect(
      screen.getByText("Điều 1. Duy trì thông tin chính xác.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Đăng ký đối tác" })
    ).toHaveAttribute("href", "/avin-check/apply");
  });
});
