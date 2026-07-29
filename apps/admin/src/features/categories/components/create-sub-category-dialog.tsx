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
import { toast } from "sonner";

import { addSubCategory } from "../api/mock-categories";
import type { ParentCategory } from "../types";

interface Props {
  readonly open: boolean;
  readonly parentCategory: ParentCategory | null;
  readonly onOpenChange: (open: boolean) => void;
}

export function CreateSubCategoryDialog({
  open,
  parentCategory,
  onOpenChange,
}: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [commissionRate, setCommissionRate] = useState(
    parentCategory ? String(parentCategory.commissionRatePercent) : "5"
  );
  const [warrantyHours, setWarrantyHours] = useState("72");
  const [minWarranty, setMinWarranty] = useState("24");
  const [maxWarranty, setMaxWarranty] = useState("720");
  const [warrantyTerms, setWarrantyTerms] = useState(
    "Bảo hành mặc định 1 đổi 1"
  );

  if (!parentCategory) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      addSubCategory({
        commissionRatePercent: Number.parseFloat(commissionRate),
        defaultWarrantyDurationHours: Number.parseInt(warrantyHours, 10),
        defaultWarrantyTerms: warrantyTerms,
        maxWarrantyHours: Number.parseInt(maxWarranty, 10),
        minWarrantyHours: Number.parseInt(minWarranty, 10),
        name,
        parentId: parentCategory.id,
        slug: slug || name.toLowerCase().replaceAll(/\s+/g, "-"),
      });

      toast.success("Tạo Sub-Category thành công", {
        description: `Đã thêm ${name} vào ${parentCategory.name}`,
      });
      onOpenChange(false);
      setName("");
      setSlug("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Thêm Sub-Category mới</DialogTitle>
            <DialogDescription>
              Thêm danh mục con vào <strong>{parentCategory.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subcat-name">Tên Sub-Category</Label>
              <Input
                id="subcat-name"
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) {
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replaceAll(/[^a-z0-9]+/g, "-")
                    );
                  }
                }}
                placeholder="VD: Tài Khoản OpenAI ChatGPT"
                required
                value={name}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subcat-slug">URL Slug</Label>
              <Input
                id="subcat-slug"
                onChange={(e) => setSlug(e.target.value)}
                placeholder="chatgpt-accounts"
                required
                value={slug}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="commission">Chiết khấu sàn (%)</Label>
                <Input
                  id="commission"
                  max="100"
                  min="0"
                  onChange={(e) => setCommissionRate(e.target.value)}
                  step="0.5"
                  type="number"
                  value={commissionRate}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="default-warranty">
                  Bảo hành mặc định (Giờ)
                </Label>
                <Input
                  id="default-warranty"
                  onChange={(e) => setWarrantyHours(e.target.value)}
                  type="number"
                  value={warrantyHours}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="min-warranty">
                  Hạn bảo hành tối thiểu (Giờ)
                </Label>
                <Input
                  id="min-warranty"
                  onChange={(e) => setMinWarranty(e.target.value)}
                  type="number"
                  value={minWarranty}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="max-warranty">Hạn bảo hành tối đa (Giờ)</Label>
                <Input
                  id="max-warranty"
                  onChange={(e) => setMaxWarranty(e.target.value)}
                  type="number"
                  value={maxWarranty}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="terms">Điều khoản bảo hành mẫu</Label>
              <Textarea
                id="terms"
                onChange={(e) => setWarrantyTerms(e.target.value)}
                rows={2}
                value={warrantyTerms}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <Button type="submit">Thêm Sub-Category</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
