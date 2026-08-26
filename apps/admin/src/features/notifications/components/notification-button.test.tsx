import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { NotificationButton } from "./notification-button";

vi.mock("@avin/ui/components/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => (
    <div data-popover="true">{children}</div>
  ),
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({ children, ...props }: { children: ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@avin/ui/components/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a data-router-link="true" href={to}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({
    data: { user: { id: "user-admin-1" } },
    isPending: false,
  }),
}));

vi.mock("../api/notifications-api", () => ({
  useAdminNotificationActions: () => ({
    markAllRead: { isPending: false, mutate: vi.fn() },
    markRead: { isPending: false, mutate: vi.fn() },
  }),
  useAdminNotificationUnreadCount: () => ({ data: 2 }),
  useAdminNotifications: () => ({
    data: {
      items: [
        {
          body: "Có hồ sơ Seller mới cần duyệt.",
          deepLink: "/seller-applications",
          id: "notification-admin-1",
          readAt: null,
          title: "Hồ sơ seller mới",
        },
      ],
    },
    isPending: false,
  }),
}));

describe("NotificationButton", () => {
  it("renders notification button with unread count and notification preview", () => {
    const html = renderToStaticMarkup(<NotificationButton />);

    expect(html).toContain("Thông báo Admin");
    expect(html).toContain("2 chưa đọc");
    expect(html).toContain("Hồ sơ seller mới");
    expect(html).toContain("Có hồ sơ Người bán mới cần duyệt.");
  });
});
