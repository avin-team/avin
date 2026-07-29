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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avin/ui/components/table";
import { FolderPlus, Layers, Percent, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import { useCategories } from "../api/mock-categories";
import { CreateSubCategoryDialog } from "../components/create-sub-category-dialog";
import type { ParentCategory } from "../types";
import { countTotalSubCategories } from "../workflow";

export function CategoriesPage() {
  const categories = useCategories();
  const [selectedParent, setSelectedParent] = useState<ParentCategory | null>(
    null
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const totalSubCategories = countTotalSubCategories(categories);

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
              <p className="text-3xl font-semibold">5% – 10%</p>
              <CardDescription>
                Thiết lập theo từng Sub-Category
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          {categories.map((parent) => (
            <Card key={parent.id}>
              <CardHeader className="flex flex-col gap-2 border-b sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{parent.name}</CardTitle>
                    <Badge variant="outline">
                      {parent.commissionRatePercent}% Commission
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    {parent.description}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setSelectedParent(parent);
                    setCreateDialogOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <FolderPlus className="size-4" />
                  Thêm Sub-Category
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sub-Category</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Chiết khấu sàn</TableHead>
                        <TableHead>Bảo hành mặc định</TableHead>
                        <TableHead>Giới hạn bảo hành</TableHead>
                        <TableHead>Trường dữ liệu mẫu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parent.subCategories.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            {sub.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {sub.slug}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {sub.commissionRatePercent}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sub.defaultWarrantyPolicy.durationHours} giờ
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sub.warrantyBounds.minHours}h –{" "}
                            {sub.warrantyBounds.maxHours}h
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {sub.defaultServiceInputs.map((input) => (
                                <Badge key={input.id} variant="outline">
                                  {input.label} ({input.type})
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {parent.subCategories.length === 0 && (
                        <TableRow>
                          <TableCell
                            className="h-20 text-center text-muted-foreground"
                            colSpan={6}
                          >
                            Chưa có Sub-Category nào. Nhấn &quot;Thêm
                            Sub-Category&quot; để tạo.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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

      <CreateSubCategoryDialog
        onOpenChange={setCreateDialogOpen}
        open={createDialogOpen}
        parentCategory={selectedParent}
      />
    </>
  );
}
