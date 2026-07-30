import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avin/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avin/ui/components/table";
import {
  ArrowDown,
  ArrowUp,
  Edit,
  Eye,
  EyeOff,
  FolderPlus,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

import type { CategoryStatus, ParentCategory, SubCategory } from "../types";

const getStatusBadgeVariant = (
  status: CategoryStatus
): "default" | "secondary" | "outline" => {
  switch (status) {
    case "ACTIVE": {
      return "default";
    }
    case "HIDDEN": {
      return "secondary";
    }
    case "ARCHIVED": {
      return "outline";
    }
    default: {
      return "default";
    }
  }
};

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

interface Props {
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly onAddSub: (parent: ParentCategory) => void;
  readonly onArchive: (id: string, level: "parent" | "sub") => void;
  readonly onDelete: (id: string, level: "parent" | "sub") => void;
  readonly onEditParent: (parent: ParentCategory) => void;
  readonly onEditSub: (sub: SubCategory) => void;
  readonly onMoveParent: (direction: "up" | "down") => void;
  readonly onMoveSub: (
    subList: readonly SubCategory[],
    index: number,
    direction: "up" | "down"
  ) => void;
  readonly onToggleStatus: (
    id: string,
    level: "parent" | "sub",
    status: CategoryStatus
  ) => void;
  readonly parent: ParentCategory;
  readonly isReorderPending: boolean;
}

export const ParentCategoryCard = ({
  isFirst,
  isLast,
  onAddSub,
  onArchive,
  onDelete,
  onEditParent,
  onEditSub,
  onMoveParent,
  onMoveSub,
  onToggleStatus,
  parent,
  isReorderPending,
}: Props) => (
  <Card key={parent.id}>
    <CardHeader className="flex flex-col gap-2 border-b sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">{parent.name}</CardTitle>
          <Badge variant={getStatusBadgeVariant(parent.status)}>
            {getStatusLabel(parent.status)}
          </Badge>
        </div>
        {parent.description && (
          <CardDescription className="mt-1">
            {parent.description}
          </CardDescription>
        )}
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          /{parent.slug}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            disabled={isFirst || isReorderPending}
            onClick={() => onMoveParent("up")}
            size="icon"
            variant="ghost"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            disabled={isLast || isReorderPending}
            onClick={() => onMoveParent("down")}
            size="icon"
            variant="ghost"
          >
            <ArrowDown className="size-4" />
          </Button>
        </div>
        <Button onClick={() => onAddSub(parent)} size="sm" variant="outline">
          <FolderPlus className="size-4" />
          Thêm Sub-Category
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="icon" variant="ghost">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditParent(parent)}>
              <Edit className="mr-2 size-4" /> Sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onToggleStatus(parent.id, "parent", parent.status)}
            >
              {parent.status === "ACTIVE" ? (
                <>
                  <EyeOff className="mr-2 size-4" /> Ẩn
                </>
              ) : (
                <>
                  <Eye className="mr-2 size-4" /> Hiện
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive(parent.id, "parent")}>
              <Eye className="mr-2 size-4" /> Lưu trữ
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(parent.id, "parent")}
            >
              <Trash2 className="mr-2 size-4" /> Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardHeader>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Thứ tự</TableHead>
              <TableHead>Sub-Category</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Chiết khấu sàn</TableHead>
              <TableHead>Bảo hành mặc định</TableHead>
              <TableHead>Giới hạn bảo hành</TableHead>
              <TableHead>Trường dữ liệu mẫu</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {parent.subCategories.map((sub, subIdx) => (
              <TableRow key={sub.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      disabled={subIdx === 0 || isReorderPending}
                      onClick={() =>
                        onMoveSub(parent.subCategories, subIdx, "up")
                      }
                      size="icon"
                      variant="ghost"
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <Button
                      disabled={
                        subIdx === parent.subCategories.length - 1 ||
                        isReorderPending
                      }
                      onClick={() =>
                        onMoveSub(parent.subCategories, subIdx, "down")
                      }
                      size="icon"
                      variant="ghost"
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{sub.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {sub.slug}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(sub.status)}>
                    {getStatusLabel(sub.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {sub.commissionRatePercent}%
                  </Badge>
                </TableCell>
                <TableCell>
                  {sub.defaultWarrantyPolicy?.durationHours} giờ
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {sub.warrantyBounds?.minHours}h –{" "}
                  {sub.warrantyBounds?.maxHours}h
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {sub.defaultServiceInputs?.map((input) => (
                      <Badge key={input.id} variant="outline">
                        {input.label} ({input.type})
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditSub(sub)}>
                        <Edit className="mr-2 size-4" /> Sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onToggleStatus(sub.id, "sub", sub.status)
                        }
                      >
                        {sub.status === "ACTIVE" ? (
                          <>
                            <EyeOff className="mr-2 size-4" /> Ẩn
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 size-4" /> Hiện
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onArchive(sub.id, "sub")}
                      >
                        <Eye className="mr-2 size-4" /> Lưu trữ
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(sub.id, "sub")}
                      >
                        <Trash2 className="mr-2 size-4" /> Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {parent.subCategories.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-20 text-center text-muted-foreground"
                  colSpan={9}
                >
                  Chưa có Sub-Category nào. Nhấn &quot;Thêm Sub-Category&quot;
                  để tạo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);
