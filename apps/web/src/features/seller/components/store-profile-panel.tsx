import { createStoreSlug } from "@avin/api/seller-store/profile";
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Eye, LoaderCircle, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

import { SellerBannerUploader } from "./seller-banner-uploader";
import type { SellerBannerValue } from "./seller-banner-uploader";
import { SellerLogoUploader } from "./seller-logo-uploader";
import type { SellerLogoValue } from "./seller-logo-uploader";

interface StoreProfileData {
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  storeSlug: string;
  storefrontName: string;
}

interface StoreProfileDraft {
  avatarName: string;
  avatarUrl: string;
  bannerName: string;
  bannerUrl: string;
  bio: string;
  slugCustomized: boolean;
  storeSlug: string;
  storefrontName: string;
}

interface StoreProfileEditorState {
  draft: StoreProfileDraft;
  savedDraft: StoreProfileDraft;
}

interface BasicProfileFormProps {
  draft: StoreProfileDraft;
  onBioChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
}

interface MediaProfileFormProps {
  disabled: boolean;
  draft: StoreProfileDraft;
  onBannerChange: (value: SellerBannerValue) => void;
  onLogoChange: (value: SellerLogoValue) => void;
  onUploadingChange: (isUploading: boolean) => void;
}

interface ProfileActionsProps {
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

interface StorefrontPreviewCardProps {
  avatarUrl: string;
  bannerUrl: string;
  description: string;
  name: string;
  slug: string;
}

const FIELD_CLASS_NAME = "bg-background";

const createDraft = (profile: StoreProfileData | null): StoreProfileDraft => ({
  avatarName: "",
  avatarUrl: profile?.avatarUrl ?? "",
  bannerName: "",
  bannerUrl: profile?.bannerUrl ?? "",
  bio: profile?.bio ?? "",
  slugCustomized: Boolean(profile?.storeSlug),
  storeSlug: profile?.storeSlug ?? "",
  storefrontName: profile?.storefrontName ?? "",
});

const BasicProfileForm = ({
  draft,
  onBioChange,
  onNameChange,
  onSlugChange,
}: BasicProfileFormProps) => (
  <FieldGroup className="gap-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="store-name">
          Tên gian hàng <span className="text-primary">*</span>
        </FieldLabel>
        <Input
          className={FIELD_CLASS_NAME}
          id="store-name"
          onChange={(event) => onNameChange(event.target.value)}
          value={draft.storefrontName}
        />
        <FieldDescription>Tên hiển thị trên trang gian hàng.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="store-slug">
          Đường dẫn gian hàng <span className="text-primary">*</span>
        </FieldLabel>
        <Input
          className={FIELD_CLASS_NAME}
          id="store-slug"
          onChange={(event) => onSlugChange(event.target.value)}
          value={draft.storeSlug}
        />
        <FieldDescription>
          Địa chỉ công khai của gian hàng, chỉ dùng chữ thường, số và dấu gạch
          ngang.
        </FieldDescription>
      </Field>
    </div>
    <Field>
      <FieldLabel htmlFor="store-description">
        Mô tả gian hàng <span className="text-primary">*</span>
      </FieldLabel>
      <Textarea
        className={`min-h-32 resize-y leading-6 ${FIELD_CLASS_NAME}`}
        id="store-description"
        onChange={(event) => onBioChange(event.target.value)}
        value={draft.bio ?? ""}
      />
      <FieldDescription>
        Nói rõ bạn cung cấp gì, dành cho ai và khách nhận được điều gì.
      </FieldDescription>
    </Field>
    <Field>
      <FieldLabel>Trạng thái gian hàng</FieldLabel>
      <div className="flex h-10 items-center rounded-xl border border-border bg-background px-3">
        <Badge variant="outline">Nháp</Badge>
      </div>
      <FieldDescription>
        Hồ sơ được lưu riêng tư. Gian hàng chỉ bắt đầu hiển thị sau khi bạn mở
        bán.
      </FieldDescription>
    </Field>
  </FieldGroup>
);

const MediaProfileForm = ({
  disabled,
  draft,
  onBannerChange,
  onLogoChange,
  onUploadingChange,
}: MediaProfileFormProps) => (
  <div className="flex flex-col gap-4">
    <div>
      <h3 className="font-semibold">Hình ảnh gian hàng</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Thêm ảnh đại diện bắt buộc và banner tùy chọn để khách nhận ra gian hàng
        của bạn.
      </p>
    </div>
    <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <SellerLogoUploader
          disabled={disabled}
          fileName={draft.avatarName}
          logoUrl={draft.avatarUrl ?? ""}
          onLogoChange={onLogoChange}
          onUploadingChange={onUploadingChange}
        />
        <p className="text-xs text-muted-foreground">Ảnh đại diện *</p>
      </div>
      <div className="flex flex-col gap-2">
        <SellerBannerUploader
          bannerUrl={draft.bannerUrl ?? ""}
          disabled={disabled}
          fileName={draft.bannerName}
          onBannerChange={onBannerChange}
          onUploadingChange={onUploadingChange}
        />
        <p className="text-xs text-muted-foreground">Banner tùy chọn</p>
      </div>
    </div>
  </div>
);

const ProfileActions = ({
  isSaving,
  onCancel,
  onSave,
}: ProfileActionsProps) => (
  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-5">
    <Button
      disabled={isSaving}
      onClick={onCancel}
      type="button"
      variant="ghost"
    >
      Hủy bỏ
    </Button>
    <Button
      disabled={isSaving}
      onClick={onSave}
      type="button"
      variant="outline"
    >
      Lưu nháp
    </Button>
    <Button disabled={isSaving} onClick={onSave} type="button">
      {isSaving ? (
        <LoaderCircle className="animate-spin" data-icon="inline-start" />
      ) : null}
      {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
    </Button>
  </div>
);

export const StorefrontPreviewCard = ({
  avatarUrl,
  bannerUrl,
  description,
  name,
  slug,
}: StorefrontPreviewCardProps) => (
  <Card>
    <CardContent>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-muted text-sm font-bold tracking-wide">
          {bannerUrl ? (
            <img
              alt="Banner gian hàng"
              className="absolute inset-0 size-full object-cover"
              src={bannerUrl}
            />
          ) : null}
          <span className="relative px-4 text-center">
            {name || "TÊN GIAN HÀNG"}
          </span>
        </div>
        <div className="p-4">
          <div className="-mt-10 flex size-14 items-center justify-center rounded-2xl border-4 border-card bg-primary text-primary-foreground">
            {avatarUrl ? (
              <img
                alt="Ảnh đại diện gian hàng"
                className="size-full rounded-xl object-cover"
                src={avatarUrl}
              />
            ) : (
              <Store className="size-6" data-icon="inline-start" />
            )}
          </div>
          <p className="mt-3 font-semibold">
            {name || "Tên gian hàng của bạn"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {description || "Mô tả gian hàng sẽ hiển thị ở đây."}
          </p>
          <p className="mt-2 truncate text-[11px] text-muted-foreground">
            /{slug || "duong-dan-gian-hang"}
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

const CompletionCard = ({ draft }: { draft: StoreProfileDraft }) => {
  const hasRequiredText = Boolean(
    draft.storefrontName.trim() && draft.storeSlug.trim() && draft.bio?.trim()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trạng thái hồ sơ</CardTitle>
        <CardDescription>
          Hoàn thiện các mục để sẵn sàng mở bán.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {[
          { done: hasRequiredText, label: "Tạo gian hàng" },
          { done: Boolean(draft.avatarUrl), label: "Thêm hình ảnh" },
          { done: false, label: "Chọn sản phẩm để mở bán" },
        ].map((item) => (
          <div className="flex items-center gap-2" key={item.label}>
            <span
              className={`flex size-5 items-center justify-center rounded-full ${item.done ? "bg-primary text-primary-foreground" : "border border-border text-transparent"}`}
            >
              <span aria-hidden="true">✓</span>
            </span>
            <span
              className={item.done ? "text-muted-foreground" : "font-medium"}
            >
              {item.label}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

interface StoreProfileEditorProps {
  onPreview: () => void;
  onSaved: () => void;
  profile: StoreProfileData | null;
}

const StoreProfileEditor = ({
  onPreview,
  onSaved,
  profile,
}: StoreProfileEditorProps) => {
  const [editorState, setEditorState] = useState<StoreProfileEditorState>(
    () => {
      const draft = createDraft(profile);
      return { draft, savedDraft: draft };
    }
  );
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const { draft } = editorState;
  const updateProfileMutation = useMutation(
    orpc.sellerStore.updateProfile.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Không thể lưu hồ sơ gian hàng");
      },
      onSuccess: ({ profile: savedProfile }) => {
        const nextDraft: StoreProfileDraft = {
          ...draft,
          avatarUrl: savedProfile.avatarUrl ?? "",
          bannerUrl: savedProfile.bannerUrl ?? "",
          bio: savedProfile.bio ?? "",
          slugCustomized: true,
          storeSlug: savedProfile.storeSlug,
          storefrontName: savedProfile.storefrontName,
        };
        setEditorState({ draft: nextDraft, savedDraft: nextDraft });
        toast.success("Đã lưu hồ sơ gian hàng");
        onSaved();
      },
    })
  );

  const handleNameChange = (storefrontName: string) => {
    setEditorState((previous) => ({
      ...previous,
      draft: {
        ...previous.draft,
        storeSlug:
          !previous.draft.slugCustomized && storefrontName.trim()
            ? createStoreSlug(storefrontName)
            : previous.draft.storeSlug,
        storefrontName,
      },
    }));
  };

  const handleLogoChange = (value: SellerLogoValue) => {
    setEditorState((previous) => ({
      ...previous,
      draft: {
        ...previous.draft,
        avatarName: value.name,
        avatarUrl: value.url,
      },
    }));
  };

  const handleBannerChange = (value: SellerBannerValue) => {
    setEditorState((previous) => ({
      ...previous,
      draft: {
        ...previous.draft,
        bannerName: value.name,
        bannerUrl: value.url,
      },
    }));
  };

  const handleSave = () => {
    const input = {
      avatarUrl: draft.avatarUrl.trim(),
      bannerUrl: draft.bannerUrl.trim(),
      bio: draft.bio.trim(),
      storeSlug: draft.storeSlug.trim(),
      storefrontName: draft.storefrontName.trim(),
    };

    if (
      !input.avatarUrl ||
      !input.bio ||
      !input.storeSlug ||
      !input.storefrontName
    ) {
      toast.error("Vui lòng nhập đủ thông tin và thêm ảnh đại diện");
      return;
    }

    updateProfileMutation.mutate(input);
  };

  const handleCancel = () => {
    setEditorState((previous) => ({
      ...previous,
      draft: previous.savedDraft,
    }));
  };

  return (
    <div className="flex flex-col gap-5">
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
          <Button onClick={onPreview} size="sm" type="button" variant="outline">
            <Eye data-icon="inline-start" />
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
          <CardContent className="flex flex-col gap-8">
            <BasicProfileForm
              draft={draft}
              onBioChange={(bio) =>
                setEditorState((previous) => ({
                  ...previous,
                  draft: { ...previous.draft, bio },
                }))
              }
              onNameChange={handleNameChange}
              onSlugChange={(storeSlug) => {
                setEditorState((previous) => ({
                  ...previous,
                  draft: {
                    ...previous.draft,
                    slugCustomized: true,
                    storeSlug,
                  },
                }));
              }}
            />
            <div className="border-t border-border/60 pt-6">
              <MediaProfileForm
                disabled={updateProfileMutation.isPending || isMediaUploading}
                draft={draft}
                onBannerChange={handleBannerChange}
                onLogoChange={handleLogoChange}
                onUploadingChange={setIsMediaUploading}
              />
            </div>
            <ProfileActions
              isSaving={updateProfileMutation.isPending || isMediaUploading}
              onCancel={handleCancel}
              onSave={handleSave}
            />
          </CardContent>
        </Card>
        <aside className="flex flex-col gap-5 xl:sticky xl:top-24 xl:self-start">
          <StorefrontPreviewCard
            avatarUrl={draft.avatarUrl ?? ""}
            bannerUrl={draft.bannerUrl ?? ""}
            description={draft.bio ?? ""}
            name={draft.storefrontName}
            slug={draft.storeSlug}
          />
          <CompletionCard draft={draft} />
        </aside>
      </div>
    </div>
  );
};

export const StoreProfilePanel = () => {
  const navigate = useNavigate();
  const profileQuery = useQuery(orpc.sellerStore.getProfile.queryOptions());

  if (profileQuery.isPending) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
        Đang tải hồ sơ gian hàng...
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
        Không thể tải hồ sơ gian hàng. Vui lòng thử lại.
      </div>
    );
  }

  return (
    <StoreProfileEditor
      key={profileQuery.data.profile?.id ?? "new"}
      onPreview={() => navigate({ to: "/seller/store-preview" })}
      onSaved={() => {
        void profileQuery.refetch();
      }}
      profile={profileQuery.data.profile}
    />
  );
};
