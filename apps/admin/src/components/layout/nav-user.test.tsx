import { describe, expect, it, vi } from "vitest";

import { NavUser } from "./nav-user";

const { useSession } = vi.hoisted(() => ({
  useSession: vi.fn(() => ({ data: null })),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: vi.fn() },
  useSession,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@avin/ui/components/avatar", () => ({
  Avatar: "div",
  AvatarFallback: "div",
  AvatarImage: "img",
}));

vi.mock("@avin/ui/components/dropdown-menu", () => ({
  DropdownMenu: "div",
  DropdownMenuContent: "div",
  DropdownMenuGroup: "div",
  DropdownMenuItem: "div",
  DropdownMenuLabel: "div",
  DropdownMenuSeparator: "div",
  DropdownMenuTrigger: "div",
}));

vi.mock("@avin/ui/components/sidebar", () => ({
  SidebarMenu: "div",
  SidebarMenuButton: "div",
  SidebarMenuItem: "div",
  useSidebar: () => ({ isMobile: false }),
}));

describe("NavUser", () => {
  it("uses the session returned by the route instead of fetching it again", () => {
    NavUser({
      user: {
        avatar: "",
        email: "admin@avin.vn",
        name: "Admin Avin",
      },
    });

    expect(useSession).not.toHaveBeenCalled();
  });
});
