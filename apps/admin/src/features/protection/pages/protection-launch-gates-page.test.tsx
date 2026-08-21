import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProtectionLaunchGatesPage } from "./protection-launch-gates-page";

const { Container, Icon } = vi.hoisted(() => {
  const containerMarker = "mock-container";
  const emptyIcon = null;

  return {
    Container: ({ children }: { children: ReactNode }) => (
      <div data-testid={containerMarker}>{children}</div>
    ),
    Icon: () => emptyIcon,
  };
});

vi.mock("../api/protection-api", () => ({
  useProtectionLaunchStatus: () => ({
    data: undefined,
    isError: true,
  }),
}));

vi.mock("@avin/ui/components/badge", () => ({
  Badge: Container,
}));

vi.mock("@avin/ui/components/card", () => ({
  Card: Container,
  CardContent: Container,
  CardDescription: Container,
  CardHeader: Container,
  CardTitle: Container,
}));

vi.mock("@phosphor-icons/react", () => ({
  CheckCircleIcon: Icon,
  LockKeyIcon: Icon,
  ShieldCheckIcon: Icon,
  WarningCircleIcon: Icon,
}));

vi.mock("@/components/layout/header", () => ({
  Header: Container,
}));

vi.mock("@/components/layout/main", () => ({
  Main: Container,
}));

describe("ProtectionLaunchGatesPage", () => {
  it("does not render protected controls when the Admin capability API denies access", () => {
    const html = renderToStaticMarkup(<ProtectionLaunchGatesPage />);

    expect(html).toContain("Không thể tải trạng thái launch gates");
    expect(html).not.toContain("Public publication");
    expect(html).not.toContain("Ghi nhận Provider Bond");
    expect(html).not.toContain("Bốn gate độc lập");
  });
});
