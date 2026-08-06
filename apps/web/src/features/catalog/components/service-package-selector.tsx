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
            <button
              key={packageItem.id}
              onClick={() => onChange(packageItem.id)}
              type="button"
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/80 hover:bg-muted/50"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <PackageIcon className="h-5 w-5" />
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold text-sm ${
                      isSelected ? "text-foreground" : "text-foreground"
                    }`}
                  >
                    {packageItem.name}
                  </span>
                  <span
                    className={`font-bold text-sm ${
                      isSelected ? "text-primary" : "text-foreground"
                    }`}
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
            </button>
          );
        })}
      </div>
    </div>
  );
};
