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

import { useUpdateParentCategory } from "../api/categories-api";
import type { ParentCategory } from "../types";

interface Props {
  readonly category: ParentCategory | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

interface FormProps {
  readonly category: ParentCategory;
  readonly onClose: () => void;
}

const EditParentCategoryForm = ({ category, onClose }: FormProps) => {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");

  const updateMutation = useUpdateParentCategory();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        description: description.trim() || undefined,
        id: category.id,
        name: name.trim(),
      },
      {
        onError: (error) => {
          toast.error(error.message || "Có lỗi xảy ra");
        },
        onSuccess: () => {
          toast.success("Cập nhật danh mục cha thành công");
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
          <Label htmlFor="description">Mô tả</Label>
          <Textarea
            id="description"
            onChange={(e) => setDescription(e.target.value)}
            value={description}
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

export const EditParentCategoryDialog = ({
  category,
  onOpenChange,
  open,
}: Props) => {
  if (!category) {
    return null;
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa danh mục cha</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin danh mục cha.
          </DialogDescription>
        </DialogHeader>
        <EditParentCategoryForm
          category={category}
          key={category.id}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
