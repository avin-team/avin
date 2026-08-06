import { Button } from "@avin/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@avin/ui/components/dropdown-menu";
import { cn } from "@avin/ui/lib/utils";
import { ListIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

type TopNavProps = React.HTMLAttributes<HTMLElement> & {
  links: {
    title: string;
    href: string;
    isActive: boolean;
    disabled?: boolean;
  }[];
};

export const TopNav = ({ className, links, ...props }: TopNavProps) => (
  <>
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={
          <Button
            size="icon"
            variant="outline"
            className={cn("md:size-7 lg:hidden", className)}
          />
        }
      >
        <ListIcon />
        <span className="sr-only">Toggle navigation menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start">
        {links.map(({ title, href, isActive, disabled }) => (
          <DropdownMenuItem
            key={`${title}-${href}`}
            render={
              <Link
                to={href}
                className={isActive ? "" : "text-muted-foreground"}
                disabled={disabled}
              />
            }
          >
            {title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>

    <nav
      className={cn(
        "hidden items-center space-x-4 lg:flex lg:space-x-4 xl:space-x-6",
        className
      )}
      {...props}
    >
      {links.map(({ title, href, isActive, disabled }) => (
        <Link
          key={`${title}-${href}`}
          to={href}
          disabled={disabled}
          className={`text-sm font-medium transition-colors hover:text-primary ${isActive ? "" : "text-muted-foreground"}`}
        >
          {title}
        </Link>
      ))}
    </nav>
  </>
);
