import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

import { SellerApplicationQueuePage } from "./seller-application-queue-page";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <a href="/">{children}</a>,
}));

vi.mock("../api/seller-applications-api", () => ({
  useAdminSellerApplications: () => ({ data: [], isPending: false }),
}));

vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children: ReactNode }) => (
    <header>{children}</header>
  ),
}));
vi.mock("@/components/layout/main", () => ({
  Main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/theme-switch", () => ({ ThemeSwitch: () => null }));
vi.mock("../components/application-status-badge", () => ({
  ApplicationStatusBadge: () => <span>Status</span>,
}));

const { Container } = vi.hoisted(() => ({
  Container: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@avin/ui/components/button", () => ({ Button: Container }));
vi.mock("@avin/ui/components/card", () => ({
  Card: Container,
  CardContent: Container,
  CardHeader: Container,
  CardTitle: Container,
}));
vi.mock("@avin/ui/components/input", () => ({ Input: () => <input /> }));
vi.mock("@avin/ui/components/select", () => ({
  Select: Container,
  SelectContent: Container,
  SelectItem: Container,
  SelectTrigger: Container,
  SelectValue: () => null,
}));
vi.mock("@avin/ui/components/table", () => ({
  Table: Container,
  TableBody: Container,
  TableCell: Container,
  TableHead: Container,
  TableHeader: Container,
  TableRow: Container,
}));

it("renders an empty state when the real API returns no applications", () => {
  const html = renderToStaticMarkup(<SellerApplicationQueuePage />);

  expect(html).not.toContain("Mock Storefront");
  expect(html).toContain("(0)");
});
