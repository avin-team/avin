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

import { useCreateParentCategory } from "../api/categories-api";

interface Props {
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

export const CreateParentCategoryDialog = ({ onOpenChange, open }: Props) => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useCreateParentCategory();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setSlug("");
      setDescription("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        description: description.trim() || undefined,
        name: name.trim(),
        slug: slug.trim() || undefined,
      },
      {
        onError: (error) => {
          toast.error(error.message || "Có lỗi xảy ra");
        },
        onSuccess: () => {
          toast.success("Thêm danh mục cha thành công");
          handleOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm danh mục cha mới</DialogTitle>
          <DialogDescription>Tạo một danh mục cha mới.</DialogDescription>
        </DialogHeader>
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
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                onChange={(e) => setSlug(e.target.value)}
                value={slug}
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
            <Button
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <Button disabled={createMutation.isPending} type="submit">
              Tạo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
