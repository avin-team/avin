import {
  NativeSelect,
  NativeSelectOption,
} from "@avin/ui/components/native-select";

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

  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <h2 className="text-sm font-bold text-foreground">Chọn gói dịch vụ</h2>
      <p className="text-xs text-muted-foreground">
        Mỗi gói có phạm vi, thời gian xử lý và điều khoản riêng.
      </p>
      <label className="block text-sm font-medium" htmlFor="service-package">
        Gói bạn muốn mua
      </label>
      <NativeSelect
        className="w-full"
        id="service-package"
        onChange={(event) => onChange(event.target.value || null)}
        value={selectedPackage?.id ?? ""}
      >
        {packages.length > 1 ? (
          <NativeSelectOption value="">Chọn một gói</NativeSelectOption>
        ) : null}
        {packages.map((packageItem) => (
          <NativeSelectOption key={packageItem.id} value={packageItem.id}>
            {packageItem.name} · {formatVND(packageItem.priceAmount)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {selectedPackage ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>{selectedPackage.description}</p>
          <p>{selectedPackage.processingTimeHours} giờ xử lý</p>
        </div>
      ) : null}
    </div>
  );
};
