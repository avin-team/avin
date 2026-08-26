import { describe, expect, it } from "vitest";

import { isNavItemActive } from "./nav-active";

describe("isNavItemActive", () => {
  it("matches category and listing pages for /category", () => {
    expect(isNavItemActive("/category", "/category")).toBe(true);
    expect(isNavItemActive("/category", "/category/tai-khoan-game")).toBe(true);
    expect(isNavItemActive("/category", "/listing/test-item-123")).toBe(true);
    expect(isNavItemActive("/category", "/")).toBe(false);
    expect(isNavItemActive("/category", "/avin-check")).toBe(false);
    expect(isNavItemActive("/category", "/categorize")).toBe(false);
  });

  it("matches avin-check and nested routes for /avin-check", () => {
    expect(isNavItemActive("/avin-check", "/avin-check")).toBe(true);
    expect(isNavItemActive("/avin-check", "/avin-check/directory")).toBe(true);
    expect(isNavItemActive("/avin-check", "/avin-check/reports")).toBe(true);
    expect(isNavItemActive("/avin-check", "/avin-check/warning/test")).toBe(
      true
    );
    expect(isNavItemActive("/avin-check", "/")).toBe(false);
    expect(isNavItemActive("/avin-check", "/category")).toBe(false);
    expect(isNavItemActive("/avin-check", "/avin-check-fraud")).toBe(false);
  });

  it("matches exact root for /", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/", "/category")).toBe(false);
    expect(isNavItemActive("/", "/avin-check")).toBe(false);
  });
});
