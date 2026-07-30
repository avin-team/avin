import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ListingSearchBar } from "./listing-search-bar";

describe("ListingSearchBar", () => {
  afterEach(cleanup);

  it("submits search query and triggers callbacks", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onSortChange = vi.fn();

    render(
      <ListingSearchBar
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
        sortBy="newest"
      />
    );

    const input = screen.getByPlaceholderText(
      "Tìm kiếm tin đăng theo từ khóa..."
    );
    await user.type(input, "Facebook{Enter}");

    expect(onSearchChange).toHaveBeenCalledWith("Facebook");
  });

  it("handles sort select change", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onSortChange = vi.fn();

    render(
      <ListingSearchBar
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
        sortBy="newest"
      />
    );

    const select = screen.getByRole("combobox", {
      name: /Sắp xếp tin đăng/iu,
    });
    await user.selectOptions(select, "price_asc");

    expect(onSortChange).toHaveBeenCalledWith("price_asc");
  });
});
