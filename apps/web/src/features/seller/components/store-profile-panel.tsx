import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import { Label } from "@avin/ui/components/label";
import { Textarea } from "@avin/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Eye, ImagePlus, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

import { MOCK_STORE_PROFILE } from "../data/store-mock-data";
import { SellerLogoUploader } from "./seller-logo-uploader";
import type { SellerLogoValue } from "./seller-logo-uploader";

interface StoreProfileState {
  avatarName: string;
  avatarUrl?: string;
  bannerName: string;
}

interface UploadZoneProps {
  fileName: string;
  label: string;
  onSelect: (name: string) => void;
  ratio: string;
}

const FIELD_CLASS_NAME = "bg-background";

const BasicProfileForm = () => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="store-name">
          Tên gian hàng <span className="text-primary">*</span>
        </Label>
        <Input
          className={FIELD_CLASS_NAME}
          defaultValue={MOCK_STORE_PROFILE.name}
          id="store-name"
        />
        <p className="text-xs text-muted-foreground">
          Tên hiển thị trên trang gian hàng.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="store-slug">
          Đường dẫn gian hàng <span className="text-primary">*</span>
        </Label>
        <Input
          className={FIELD_CLASS_NAME}
          defaultValue={MOCK_STORE_PROFILE.slug}
          id="store-slug"
        />
        <p className="text-xs text-muted-foreground">
          Địa chỉ công khai của gian hàng.
        </p>
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="store-description">
        Mô tả gian hàng <span className="text-primary">*</span>
      </Label>
      <Textarea
        className={`min-h-32 resize-y leading-6 ${FIELD_CLASS_NAME}`}
        defaultValue={MOCK_STORE_PROFILE.description}
        id="store-description"
      />
      <p className="text-xs text-muted-foreground">
        Nói rõ bạn cung cấp gì, dành cho ai và khách nhận được điều gì.
      </p>
    </div>
    <div className="space-y-2">
      <Label>Trạng thái gian hàng</Label>
      <div className="flex h-10 items-center rounded-xl border border-border bg-background px-3">
        <Badge variant="outline">Nháp</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Gian hàng chỉ bắt đầu hiển thị sau khi bạn mở bán.
      </p>
    </div>
  </div>
);

const UploadZone = ({ fileName, label, onSelect, ratio }: UploadZoneProps) => (
  <label
    className={`group relative flex ${ratio} cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-center transition-colors hover:border-primary hover:bg-primary/5`}
  >
    <input
      accept="image/*"
      className="sr-only"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) {
          onSelect(file.name);
        }
      }}
      type="file"
    />
    <ImagePlus className="size-7 text-muted-foreground transition-colors group-hover:text-primary" />
    <span className="mt-3 text-sm font-medium">
      {fileName || `Thêm ${label}`}
    </span>
    <span className="mt-1 text-xs text-muted-foreground">
      PNG hoặc JPG · tối đa 5MB
    </span>
  </label>
);

interface MediaProfileFormProps {
  avatarUrl: string;
  state: StoreProfileState;
  onLogoChange: (value: SellerLogoValue) => void;
  onSelectFile: (name: string) => void;
}

const MediaProfileForm = ({
  avatarUrl,
  onLogoChange,
  onSelectFile,
  state,
}: MediaProfileFormProps) => (
  <div className="space-y-4">
    <div>
      <h3 className="font-semibold">Hình ảnh gian hàng</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Thêm ảnh đại diện và banner để khách nhận ra gian hàng của bạn.
      </p>
    </div>
    <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
      <SellerLogoUploader
        fileName={state.avatarName}
        logoUrl={avatarUrl}
        onLogoChange={onLogoChange}
      />
      <UploadZone
        fileName={state.bannerName}
        label="ảnh banner"
        onSelect={onSelectFile}
        ratio="aspect-[2.4/1]"
      />
    </div>
  </div>
);

interface ProfileActionsProps {
  isSaving: boolean;
  onSave: () => void;
}

const ProfileActions = ({ isSaving, onSave }: ProfileActionsProps) => (
  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-5">
    <Button disabled={isSaving} variant="ghost">
      Hủy bỏ
    </Button>
    <Button disabled={isSaving} onClick={onSave} variant="outline">
      Lưu nháp
    </Button>
    <Button disabled={isSaving} onClick={onSave}>
      {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
    </Button>
  </div>
);

const StorePreview = ({ logoUrl }: { logoUrl: string }) => (
  <Card>
    <CardHeader className="flex-row items-center justify-between space-y-0">
      <CardTitle className="text-base">Xem trước gian hàng</CardTitle>
      <Button aria-label="Mở xem trước" size="icon-sm" variant="outline">
        <ExternalLink />
      </Button>
    </CardHeader>
    <CardContent>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex h-28 items-center justify-center bg-gradient-to-br from-primary/30 via-primary/10 to-muted text-sm font-bold tracking-wide">
          STUDIO CỦA NGỌC
        </div>
        <div className="p-4">
          <div className="-mt-10 flex size-14 items-center justify-center rounded-2xl border-4 border-card bg-primary text-primary-foreground">
            {logoUrl ? (
              <img
                alt="Logo gian hàng"
                className="size-full rounded-xl object-cover"
                src={logoUrl}
              />
            ) : (
              <Store className="size-6" />
            )}
          </div>
          <p className="mt-3 font-semibold">{MOCK_STORE_PROFILE.name}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Dịch vụ số cho người bận rộn.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px] text-muted-foreground">
            <div className="rounded-lg bg-muted/50 p-2">0 sản phẩm</div>
            <div className="rounded-lg bg-muted/50 p-2">Chưa mở bán</div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const CompletionCard = ({ logoUrl }: { logoUrl: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Trạng thái hồ sơ</CardTitle>
      <CardDescription>Hoàn thiện các mục để sẵn sàng mở bán.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3 text-sm">
      {[
        { done: true, label: "Tạo gian hàng" },
        { done: Boolean(logoUrl), label: "Thêm hình ảnh" },
        { done: false, label: "Chọn sản phẩm để mở bán" },
      ].map((item) => (
        <div className="flex items-center gap-2" key={item.label}>
          <span
            className={`flex size-5 items-center justify-center rounded-full ${item.done ? "bg-primary text-primary-foreground" : "border border-border text-transparent"}`}
          >
            <span aria-hidden="true">✓</span>
          </span>
          <span className={item.done ? "text-muted-foreground" : "font-medium"}>
            {item.label}
          </span>
        </div>
      ))}
    </CardContent>
  </Card>
);

export const StoreProfilePanel = () => {
  const profileQuery = useQuery(
    orpc.sellerApplication.getProfile.queryOptions()
  );
  const updateDraftMutation = useMutation(
    orpc.sellerApplication.updateDraftProfile.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Không thể lưu logo gian hàng");
      },
      onSuccess: () => {
        toast.success("Đã lưu logo gian hàng");
        profileQuery.refetch();
      },
    })
  );
  const [state, setState] = useState<StoreProfileState>({
    avatarName: "",
    bannerName: "",
  });

  const savedAvatarUrl = profileQuery.data?.profile?.avatarUrl ?? "";
  const avatarUrl = state.avatarUrl ?? savedAvatarUrl;

  const selectBanner = (name: string) => {
    setState((previous) => ({ ...previous, bannerName: name }));
  };

  const handleLogoChange = (value: SellerLogoValue) => {
    setState((previous) => ({
      ...previous,
      avatarName: value.name,
      avatarUrl: value.url,
    }));
  };

  const handleSave = () => {
    updateDraftMutation.mutate({
      avatarUrl,
      storefrontName:
        profileQuery.data?.profile?.storefrontName ?? MOCK_STORE_PROFILE.name,
    });
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-border/60 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              Hồ sơ gian hàng <span className="mx-1">/</span> Quản lý
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Hồ sơ gian hàng
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quản lý thông tin và hình ảnh hiển thị cho khách hàng.
            </p>
          </div>
          <Button size="sm" variant="outline">
            <Eye />
            Xem trang gian hàng
          </Button>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin gian hàng</CardTitle>
            <CardDescription>
              Hoàn thiện hồ sơ và diện mạo trước khi mở bán.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <BasicProfileForm />
            <div className="border-t border-border/60 pt-6">
              <MediaProfileForm
                avatarUrl={avatarUrl}
                onLogoChange={handleLogoChange}
                onSelectFile={selectBanner}
                state={state}
              />
            </div>
            <ProfileActions
              isSaving={updateDraftMutation.isPending}
              onSave={handleSave}
            />
          </CardContent>
        </Card>
        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <StorePreview logoUrl={avatarUrl} />
          <CompletionCard logoUrl={avatarUrl} />
        </aside>
      </div>
    </div>
  );
};
