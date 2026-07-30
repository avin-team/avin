import { Button } from "@avin/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avin/ui/components/dialog";
import { Input } from "@avin/ui/components/input";
import { Label } from "@avin/ui/components/label";
import { Textarea } from "@avin/ui/components/textarea";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { useUpdateSubCategory } from "../api/categories-api";
import type { SubCategory } from "../types";

interface Props {
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly subCategory: SubCategory | null;
}

interface FormProps {
  readonly onClose: () => void;
  readonly subCategory: SubCategory;
}

const EditSubCategoryForm = ({ onClose, subCategory }: FormProps) => {
  const [name, setName] = useState(subCategory.name);
  const [commissionRatePercent, setCommissionRatePercent] = useState(() =>
    subCategory.commissionRatePercent.toString()
  );
  const [defaultWarrantyDurationHours, setDefaultWarrantyDurationHours] =
    useState(
      () => subCategory.defaultWarrantyPolicy?.durationHours.toString() ?? "72"
    );
  const [minWarrantyHours, setMinWarrantyHours] = useState(
    () => subCategory.warrantyBounds?.minHours.toString() ?? "24"
  );
  const [maxWarrantyHours, setMaxWarrantyHours] = useState(
    () => subCategory.warrantyBounds?.maxHours.toString() ?? "720"
  );
  const [warrantyTerms, setWarrantyTerms] = useState(
    subCategory.defaultWarrantyPolicy?.terms ?? ""
  );

  const updateMutation = useUpdateSubCategory();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        commissionRatePercent: Number(commissionRatePercent),
        defaultWarrantyDurationHours: Number(defaultWarrantyDurationHours),
        defaultWarrantyTerms: warrantyTerms,
        id: subCategory.id,
        maxWarrantyHours: Number(maxWarrantyHours),
        minWarrantyHours: Number(minWarrantyHours),
        name: name.trim(),
      },
      {
        onError: (error) => {
          toast.error(error.message || "Có lỗi xảy ra");
        },
        onSuccess: () => {
          toast.success("Cập nhật Sub-Category thành công");
          onClose();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Tên</Label>
          <Input
            id="name"
            onChange={(e) => setName(e.target.value)}
            required
            value={name}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="commissionRate">Chiết khấu sàn (%)</Label>
          <Input
            id="commissionRate"
            max="100"
            min="0"
            onChange={(e) => setCommissionRatePercent(e.target.value)}
            required
            step="0.5"
            type="number"
            value={commissionRatePercent}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="defaultWarranty">Bảo hành mặc định (Giờ)</Label>
          <Input
            id="defaultWarranty"
            min="0"
            onChange={(e) => setDefaultWarrantyDurationHours(e.target.value)}
            required
            type="number"
            value={defaultWarrantyDurationHours}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="minWarranty">Hạn bảo hành tối thiểu (Giờ)</Label>
          <Input
            id="minWarranty"
            min="0"
            onChange={(e) => setMinWarrantyHours(e.target.value)}
            required
            type="number"
            value={minWarrantyHours}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="maxWarranty">Hạn bảo hành tối đa (Giờ)</Label>
          <Input
            id="maxWarranty"
            min="0"
            onChange={(e) => setMaxWarrantyHours(e.target.value)}
            required
            type="number"
            value={maxWarrantyHours}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="warrantyTerms">Điều khoản bảo hành mẫu</Label>
          <Textarea
            id="warrantyTerms"
            onChange={(e) => setWarrantyTerms(e.target.value)}
            required
            value={warrantyTerms}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onClose} type="button" variant="outline">
          Hủy
        </Button>
        <Button disabled={updateMutation.isPending} type="submit">
          Lưu
        </Button>
      </DialogFooter>
    </form>
  );
};

export const EditSubCategoryDialog = ({
  onOpenChange,
  open,
  subCategory,
}: Props) => {
  if (!subCategory) {
    return null;
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sửa Sub-Category</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin Sub-Category.
          </DialogDescription>
        </DialogHeader>
        <EditSubCategoryForm
          key={subCategory.id}
          onClose={() => onOpenChange(false)}
          subCategory={subCategory}
        />
      </DialogContent>
    </Dialog>
  );
};
