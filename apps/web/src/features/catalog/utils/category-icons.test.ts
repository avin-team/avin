import { describe, expect, it } from "vitest";

import { DEFAULT_CATEGORY_ICON, getCategoryIcon } from "./category-icons";

describe("getCategoryIcon", () => {
  it("returns specific icon component for known category slugs", () => {
    const fbIcon = getCategoryIcon("dich-vu-facebook");
    expect(fbIcon).toBeDefined();
    expect(fbIcon).not.toBe(DEFAULT_CATEGORY_ICON);

    const ytIcon = getCategoryIcon("dich-vu-youtube");
    expect(ytIcon).toBeDefined();
    expect(ytIcon).not.toBe(DEFAULT_CATEGORY_ICON);
  });

  it("returns default icon for unknown or empty slug", () => {
    expect(getCategoryIcon("unknown-slug")).toBe(DEFAULT_CATEGORY_ICON);
    expect(getCategoryIcon(null)).toBe(DEFAULT_CATEGORY_ICON);
    expect(getCategoryIcon()).toBe(DEFAULT_CATEGORY_ICON);
  });
});
