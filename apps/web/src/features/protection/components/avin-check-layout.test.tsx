import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AvinCheckLayout } from "./avin-check-layout";

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="avin-check-child-route" />,
}));

describe("AvinCheckLayout", () => {
  afterEach(cleanup);

  it("renders the active child route", () => {
    render(<AvinCheckLayout />);

    expect(screen.getByTestId("avin-check-child-route")).toBeInTheDocument();
  });
});
