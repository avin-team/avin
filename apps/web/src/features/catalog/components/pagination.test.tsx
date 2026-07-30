import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Pagination } from "./pagination";

describe("Pagination", () => {
  afterEach(cleanup);

  it("returns null when totalPages <= 1", () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        onPageChange={vi.fn()}
        total={5}
        totalPages={1}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders page stats and fires page change on click", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        onPageChange={onPageChange}
        total={50}
        totalPages={5}
      />
    );

    expect(screen.getByText(/Hiển thị trang/iu)).toBeInTheDocument();
    expect(screen.getByText(/50 tin đăng/iu)).toBeInTheDocument();

    const page2Btn = screen.getByRole("button", { name: "2" });
    await user.click(page2Btn);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
