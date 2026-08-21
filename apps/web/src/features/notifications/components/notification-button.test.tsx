import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationButton } from "./notification-button";

const mocks = vi.hoisted(() => ({
  markAllRead: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock("@avin/ui/components/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div data-popover="true">{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props} />
  ),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    onClick,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a
      data-router-link="true"
      href={to}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/features/auth/api/session-query", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } }, isPending: false }),
}));

vi.mock("../api/notifications-api", () => ({
  useNotificationActions: () => ({
    markAllRead: { isPending: false, mutate: mocks.markAllRead },
    markRead: { isPending: false, mutate: mocks.markRead },
  }),
  useNotificationUnreadCount: () => ({ data: 1 }),
  useNotifications: () => ({
    data: {
      items: [
        {
          body: "Bạn có đơn hàng mới đang chờ xác nhận.",
          deepLink: "/orders/order-1",
          id: "notification-1",
          readAt: null,
          title: "Đơn hàng mới cần xác nhận",
        },
      ],
    },
    isPending: false,
  }),
}));

describe("NotificationButton", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("marks an unread item and uses client-side navigation on the first click", async () => {
    const user = userEvent.setup();
    render(<NotificationButton />);

    const notificationLink = screen.getByRole("link", {
      name: /Đơn hàng mới cần xác nhận/u,
    });
    await user.click(notificationLink);

    expect(mocks.markRead).toHaveBeenCalledOnce();
    expect(mocks.markRead).toHaveBeenCalledWith({
      notificationId: "notification-1",
    });
    expect(notificationLink).toHaveAttribute("data-router-link", "true");
  });
});
