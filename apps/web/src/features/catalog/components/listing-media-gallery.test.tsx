import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ListingMediaGallery } from "./listing-media-gallery";

const TestObserver = function TestObserver() {
  return {
    disconnect: () => undefined,
    observe: () => undefined,
    unobserve: () => undefined,
  };
};

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      }) as unknown as MediaQueryList
  );
  vi.stubGlobal("IntersectionObserver", TestObserver);
  vi.stubGlobal("ResizeObserver", TestObserver);
});

describe("ListingMediaGallery", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows carousel controls and a thumbnail for every listing image", () => {
    render(
      <ListingMediaGallery
        images={["/one.png", "/two.png", "/three.png"]}
        title="Thiết kế logo"
      />
    );

    expect(
      screen.getByRole("region", { name: "Thư viện ảnh sản phẩm" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ảnh trước" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ảnh tiếp theo" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Xem ảnh 1" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("selects a thumbnail and opens the selected image in a lightbox", async () => {
    const user = userEvent.setup();
    render(
      <ListingMediaGallery
        images={["/one.png", "/two.png", "/three.png"]}
        title="Thiết kế logo"
      />
    );

    await user.click(screen.getByRole("button", { name: "Xem ảnh 3" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Xem ảnh 3" })).toHaveAttribute(
        "aria-current",
        "true"
      );
    });

    await user.click(
      screen.getByRole("button", { name: "Mở ảnh 3 ở chế độ toàn màn hình" })
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getAllByAltText("Thiết kế logo · ảnh 3").length
    ).toBeGreaterThan(0);
  });
});
