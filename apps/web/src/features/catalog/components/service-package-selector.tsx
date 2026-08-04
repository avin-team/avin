import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";

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

  const selectedPackage = packages.find(
    (packageItem) => packageItem.id === selectedPackageId
  );

  const packageItems = packages.map((packageItem) => ({
    label: `${packageItem.name} · ${formatVND(packageItem.priceAmount)}`,
    value: packageItem.id,
  }));

  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <h2 className="text-sm font-bold text-foreground">Chọn gói dịch vụ</h2>
      <p className="text-xs text-muted-foreground">
        Mỗi gói có phạm vi, thời gian xử lý và điều khoản riêng.
      </p>
      <label className="block text-sm font-medium" htmlFor="service-package">
        Gói bạn muốn mua
      </label>
      <Select
        items={packageItems}
        onValueChange={(value) => onChange(value || null)}
        value={selectedPackage?.id ?? ""}
      >
        <SelectTrigger className="w-full" id="service-package">
          <SelectValue placeholder="Chọn một gói" />
        </SelectTrigger>
        <SelectContent>
          {packageItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedPackage ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>{selectedPackage.description}</p>
          <p>{selectedPackage.processingTimeHours} giờ xử lý</p>
        </div>
      ) : null}
    </div>
  );
};
