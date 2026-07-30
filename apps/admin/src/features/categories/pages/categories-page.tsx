import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { FolderPlus, Layers, Percent, Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import {
  categoriesQueryOptions,
  useArchiveCategory,
  useDeleteCategory,
  useReorderParents,
  useReorderSubs,
  useUpdateCategoryStatus,
} from "../api/categories-api";
import { CreateParentCategoryDialog } from "../components/create-parent-category-dialog";
import { CreateSubCategoryDialog } from "../components/create-sub-category-dialog";
import { EditParentCategoryDialog } from "../components/edit-parent-category-dialog";
import { EditSubCategoryDialog } from "../components/edit-sub-category-dialog";
import { ParentCategoryCard } from "../components/parent-category-card";
import type { CategoryStatus, ParentCategory, SubCategory } from "../types";
import { countTotalSubCategories } from "../workflow";

const getStatusLabel = (status: CategoryStatus): string => {
  switch (status) {
    case "ACTIVE": {
      return "Hoạt động";
    }
    case "HIDDEN": {
      return "Đã ẩn";
    }
    case "ARCHIVED": {
      return "Lưu trữ";
    }
    default: {
      return status;
    }
  }
};

const getCommissionDisplay = (
  categories: readonly ParentCategory[]
): string => {
  const allCommissions: number[] = [];
  for (const parent of categories) {
    if (parent.subCategories) {
      for (const sub of parent.subCategories) {
        allCommissions.push(Number(sub.commissionRatePercent));
      }
    }
  }

  if (allCommissions.length === 0) {
    return "N/A";
  }

  const min = Math.min(...allCommissions);
  const max = Math.max(...allCommissions);

  if (min === max) {
    return `${min}%`;
  }

  return `${min}% – ${max}%`;
};

const reorderArray = <T,>(
  items: readonly T[],
  index: number,
  direction: "up" | "down"
): T[] | null => {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return null;
  }
  const reordered = [...items];
  const temp = reordered[index];
  reordered[index] = reordered[targetIndex];
  reordered[targetIndex] = temp;
  return reordered;
};

export const CategoriesPage = () => {
  const {
    data: categories = [],
    isLoading,
    error,
  } = useQuery(categoriesQueryOptions());

  const [createParentOpen, setCreateParentOpen] = useState(false);
  const [createSubOpen, setCreateSubOpen] = useState(false);
  const [selectedParentForCreateSub, setSelectedParentForCreateSub] =
    useState<ParentCategory | null>(null);

  const [editParentOpen, setEditParentOpen] = useState(false);
  const [selectedParentForEdit, setSelectedParentForEdit] =
    useState<ParentCategory | null>(null);

  const [editSubOpen, setEditSubOpen] = useState(false);
  const [selectedSubForEdit, setSelectedSubForEdit] =
    useState<SubCategory | null>(null);

  const updateStatusMutation = useUpdateCategoryStatus();
  const archiveMutation = useArchiveCategory();
  const deleteMutation = useDeleteCategory();
  const reorderParentsMutation = useReorderParents();
  const reorderSubsMutation = useReorderSubs();

  const totalSubCategories = countTotalSubCategories(categories);
  const commissionDisplay = getCommissionDisplay(categories);

  const handleToggleStatus = (
    id: string,
    level: "parent" | "sub",
    currentStatus: CategoryStatus
  ) => {
    const nextStatus: CategoryStatus =
      currentStatus === "ACTIVE" ? "HIDDEN" : "ACTIVE";
    updateStatusMutation.mutate(
      { id, level, status: nextStatus },
      {
        onError: (err) => {
          toast.error(err.message || "Có lỗi xảy ra khi đổi trạng thái");
        },
        onSuccess: () => {
          toast.success(
            `Đã chuyển trạng thái sang ${getStatusLabel(nextStatus)}`
          );
        },
      }
    );
  };

  const handleArchive = (id: string, level: "parent" | "sub") => {
    archiveMutation.mutate(
      { id, level },
      {
        onError: (err) => {
          toast.error(err.message || "Có lỗi xảy ra khi lưu trữ danh mục");
        },
        onSuccess: () => {
          toast.success("Đã lưu trữ danh mục thành công");
        },
      }
    );
  };

  const handleDelete = (id: string, level: "parent" | "sub") => {
    deleteMutation.mutate(
      { id, level },
      {
        onError: (err) => {
          toast.error(err.message || "Không thể xóa danh mục");
        },
        onSuccess: () => {
          toast.success("Đã xóa danh mục thành công");
        },
      }
    );
  };

  const handleMoveParent = (index: number, direction: "up" | "down") => {
    const reordered = reorderArray(categories, index, direction);
    if (!reordered) {
      return;
    }

    const items = reordered.map((cat, idx) => ({
      id: cat.id,
      sortOrder: idx,
    }));

    reorderParentsMutation.mutate(
      { items },
      {
        onError: (err) => {
          toast.error(err.message || "Có lỗi xảy ra khi sắp xếp danh mục cha");
        },
      }
    );
  };

  const handleMoveSub = (
    subList: readonly SubCategory[],
    index: number,
    direction: "up" | "down"
  ) => {
    const reordered = reorderArray(subList, index, direction);
    if (!reordered) {
      return;
    }

    const items = reordered.map((sub, idx) => ({
      id: sub.id,
      sortOrder: idx,
    }));

    reorderSubsMutation.mutate(
      { items },
      {
        onError: (err) => {
          toast.error(err.message || "Có lỗi xảy ra khi sắp xếp sub-category");
        },
      }
    );
  };

  return (
    <>
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              MARKETPLACE TAXONOMY
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Categories & Policies
            </h1>
            <p className="text-muted-foreground">
              Quản lý phân loại 2 cấp (Parent $\rightarrow$ Sub-Category), tỷ lệ
              chiết khấu sàn và chính sách bảo hành mẫu.
            </p>
          </div>
          <Button onClick={() => setCreateParentOpen(true)}>
            <Plus className="mr-2 size-4" />
            Thêm danh mục cha
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Danh Mục Cha (Parent)</CardTitle>
              <Layers className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{categories.length}</p>
              <CardDescription>2-level taxonomy root nodes</CardDescription>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Sub-Categories</CardTitle>
              <FolderPlus className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{totalSubCategories}</p>
              <CardDescription>Trực tiếp chứa Listings</CardDescription>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Tỷ lệ chiết khấu sàn</CardTitle>
              <Percent className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{commissionDisplay}</p>
              <CardDescription>
                Thiết lập theo từng Sub-Category
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {isLoading && (
          <div className="flex h-32 items-center justify-center rounded-lg border text-muted-foreground">
            Đang tải dữ liệu danh mục...
          </div>
        )}

        {error && (
          <div className="flex h-32 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
            Có lỗi xảy ra khi tải danh mục: {error.message}
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid gap-6">
            {categories.map((parent, parentIdx) => (
              <ParentCategoryCard
                isFirst={parentIdx === 0}
                isLast={parentIdx === categories.length - 1}
                isReorderPending={reorderParentsMutation.isPending}
                key={parent.id}
                onAddSub={(p) => {
                  setSelectedParentForCreateSub(p);
                  setCreateSubOpen(true);
                }}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onEditParent={(p) => {
                  setSelectedParentForEdit(p);
                  setEditParentOpen(true);
                }}
                onEditSub={(s) => {
                  setSelectedSubForEdit(s);
                  setEditSubOpen(true);
                }}
                onMoveParent={(dir) => handleMoveParent(parentIdx, dir)}
                onMoveSub={handleMoveSub}
                onToggleStatus={handleToggleStatus}
                parent={parent}
              />
            ))}

            {categories.length === 0 && (
              <div className="flex h-32 items-center justify-center rounded-lg border text-muted-foreground">
                Chưa có danh mục cha nào. Nhấn &quot;Thêm danh mục cha&quot; để
                tạo mới.
              </div>
            )}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <ShieldAlert className="size-5 text-amber-500" />
            <div>
              <CardTitle className="text-sm font-semibold">
                Quy tắc P0 Categories
              </CardTitle>
              <CardDescription className="text-xs">
                Listings thuộc đúng 1 Sub-Category. Tỷ lệ chiết khấu và điều
                khoản bảo hành snapshot trực tiếp vào OrderItem khi người mua
                thanh toán.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </Main>

      <CreateParentCategoryDialog
        onOpenChange={setCreateParentOpen}
        open={createParentOpen}
      />

      <EditParentCategoryDialog
        category={selectedParentForEdit}
        onOpenChange={setEditParentOpen}
        open={editParentOpen}
      />

      <CreateSubCategoryDialog
        onOpenChange={setCreateSubOpen}
        open={createSubOpen}
        parentCategory={selectedParentForCreateSub}
      />

      <EditSubCategoryDialog
        onOpenChange={setEditSubOpen}
        open={editSubOpen}
        subCategory={selectedSubForEdit}
      />
    </>
  );
};
