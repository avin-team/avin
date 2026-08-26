import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AvinCheckGuidePage } from "./avin-check-guide-page";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useSearch: () => ({}),
}));

describe("AvinCheckGuidePage", () => {
  afterEach(cleanup);

  it("renders the main knowledge base header and navigation sections", () => {
    render(<AvinCheckGuidePage />);

    expect(
      screen.getByRole("heading", {
        name: /1\. Điều Khoản Sử Dụng Nền Tảng/iu,
      })
    ).toBeInTheDocument();

    expect(screen.getByText("Điều khoản sử dụng")).toBeInTheDocument();
    expect(
      screen.getByText("Nội quy giao dịch & Phòng chống lừa đảo")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Quy chế Đối tác & 27 Điều khoản")
    ).toBeInTheDocument();
  });

  it("allows switching sections to view partner policy and clauses", () => {
    render(<AvinCheckGuidePage />);

    const partnerSectionBtn = screen.getByRole("button", {
      name: /Quy chế Đối tác & 27 Điều khoản/iu,
    });
    fireEvent.click(partnerSectionBtn);

    expect(
      screen.getByText(/3\. Quy Chế Đối Tác & 27 Điều Khoản Nghiệp Vụ/iu)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Điều 27: Lưu ý an toàn khi Giao Dịch Trung Gian qua Zalo/iu,
      })
    ).toBeInTheDocument();
  });

  it("supports searching across clauses and regulations", () => {
    render(<AvinCheckGuidePage />);

    const searchInput = screen.getByPlaceholderText(
      /Tìm kiếm nhanh điều khoản, quy định/iu
    );
    fireEvent.change(searchInput, { target: { value: "Zalo" } });

    expect(
      screen.getAllByText(
        /Điều 27: Lưu ý an toàn khi Giao Dịch Trung Gian qua Zalo/iu
      ).length
    ).toBeGreaterThan(0);
  });
});
