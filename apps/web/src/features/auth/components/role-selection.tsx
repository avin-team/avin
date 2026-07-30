import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import type { AccountRole } from "@avin/auth/permissions";
import { cn } from "@avin/ui/lib/utils";
import { ArrowRight, ShoppingBag, Store } from "lucide-react";

interface RoleSelectionStepProps {
  onSelectRole: (role: AccountRole) => void;
}

export const RoleSelectionStep = ({ onSelectRole }: RoleSelectionStepProps) => (
  <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <p className="font-medium text-muted-foreground text-sm">
      Vui lòng chọn vai trò bạn muốn đăng ký:
    </p>

    <div className="grid gap-4">
      <button
        className={cn(
          "group relative flex items-start gap-4 rounded-xl border border-border p-4 text-left transition-all duration-200",
          "hover:border-primary/50 hover:bg-accent/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        onClick={() => onSelectRole(ACCOUNT_ROLE.BUYER)}
        type="button"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between font-semibold text-base">
            <span>Tôi là người mua (Buyer)</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          <p className="text-muted-foreground text-sm leading-snug">
            Tìm kiếm sản phẩm, dịch vụ và đặt mua trực tuyến an toàn.
          </p>
        </div>
      </button>

      <button
        className={cn(
          "group relative flex items-start gap-4 rounded-xl border border-border p-4 text-left transition-all duration-200",
          "hover:border-primary/50 hover:bg-accent/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        onClick={() => onSelectRole(ACCOUNT_ROLE.SELLER)}
        type="button"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
          <Store className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between font-semibold text-base">
            <span>Tôi là người bán (Seller)</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          <p className="text-muted-foreground text-sm leading-snug">
            Đăng bán sản phẩm, cung cấp dịch vụ và mở rộng kinh doanh.
          </p>
        </div>
      </button>
    </div>
  </div>
);
