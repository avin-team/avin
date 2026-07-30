import { Link } from "@tanstack/react-router";

import { UserMenu } from "@/features/auth/components/user-menu";

import { ModeToggle } from "./mode-toggle";

const links = [
  { label: "Home", to: "/(public)" },
  { label: "Dashboard", to: "/_authenticated/dashboard" },
  { label: "AI Chat", to: "/_authenticated/ai" },
] as const;

const Header = () => (
  <div>
    <div className="flex flex-row items-center justify-between px-2 py-1">
      <nav className="flex gap-4 text-lg">
        {links.map(({ to, label }) => (
          <Link key={to} to={to}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <UserMenu />
      </div>
    </div>
    <hr />
  </div>
);

export default Header;
