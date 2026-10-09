import { Button } from "@avin/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@avin/ui/components/tooltip";
import { cn } from "@avin/ui/lib/utils";
import { PackageIcon } from "@phosphor-icons/react";

import { formatVND } from "@/utils/format";

interface ServicePackageOption {
  description: string;
  id: string;
  name: string;
  priceAmount: number;
  processingTimeHours: number;
}

export const ServicePackageSelector = ({
  onChange,
  packages,
  selectedPackageId,
}: {
  onChange: (packageId: string | null) => void;
  packages: readonly ServicePackageOption[];
  selectedPackageId: string | null;
}) => {
  if (packages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Chọn gói</h3>
      <div className="flex flex-col gap-3">
        {packages.map((packageItem) => {
          const isSelected = packageItem.id === selectedPackageId;
          return (
            <Button
              key={packageItem.id}
              onClick={() => onChange(packageItem.id)}
              type="button"
              variant="outline"
              className={cn(
                "flex h-auto w-full items-center justify-start gap-3 rounded-xl p-4 text-left font-normal whitespace-normal transition-all",
                isSelected
                  ? "border-primary bg-primary/5 hover:bg-primary/10"
                  : "border-border hover:border-border/80 hover:bg-muted/50"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <PackageIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {packageItem.name}
                        </span>
                      }
                    />
                    <TooltipContent side="top">
                      {packageItem.name}
                    </TooltipContent>
                  </Tooltip>
                  <span
                    className={cn(
                      "shrink-0 whitespace-nowrap text-sm font-semibold",
                      isSelected ? "text-primary" : "text-foreground"
                    )}
                  >
                    {formatVND(packageItem.priceAmount)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {packageItem.processingTimeHours
                    ? `${packageItem.processingTimeHours} giờ xử lý`
                    : "Xử lý tiêu chuẩn"}
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
