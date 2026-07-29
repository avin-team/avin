/* oxlint-disable */
import { useSidebar } from "@avin/ui/components/sidebar";

export const SkipToMain = () => {
  const { setOpenMobile } = useSidebar();

  return (
    <a
      className="bg-background text-foreground focus:ring-ring fixed top-3 left-3 z-50 -translate-y-16 rounded-md border px-4 py-2 text-sm font-medium shadow-md transition-transform focus:translate-y-0 focus:outline-none focus:ring-2"
      href="#main-content"
      onClick={() => setOpenMobile(false)}
    >
      Skip to main content
    </a>
  );
};
