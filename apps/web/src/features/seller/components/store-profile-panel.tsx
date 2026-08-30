import { createStoreSlug } from "@avin/api/seller-store/profile";
import type { StoreVisibilityReason } from "@avin/api/seller-store/profile";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { EyeIcon, SpinnerIcon, StorefrontIcon } from "@phosphor-icons/react";
import { useForm, useStore } from "@tanstack/react-form";
import type {
  FormValidateOrFn,
  ReactFormExtendedApi,
} from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

import { storeProfileFormSchema } from "../schemas/store-profile-form-schema";
import type { StoreProfileFormValues } from "../schemas/store-profile-form-schema";
import { SellerBannerUploader } from "./seller-banner-uploader";
import { SellerLogoUploader } from "./seller-logo-uploader";

interface StoreProfileData {
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  storeSlug: string;
  storefrontName: string;
}

type StoreProfileDraft = StoreProfileFormValues;
type StoreProfileFormApi = ReactFormExtendedApi<
  StoreProfileFormValues,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  FormValidateOrFn<StoreProfileFormValues>,
  undefined,
  undefined,
  undefined,
  undefined,
  unknown
>;

type StoreVisibilityStatus = "PRIVATE" | "PUBLIC";

const getStoreVisibilityLabel = (reason: StoreVisibilityReason): string => {
  if (reason === "PUBLIC") {
    return "Đã public";
  }
  if (reason === "PENDING_APPROVAL") {
    return "Đang chờ duyệt";
  }
  if (reason === "ENFORCED") {
    return "Đang bị hạn chế";
  }
  return "Đang hoàn thiện hồ sơ";
};

const getStoreVisibilityDescription = (
  reason: StoreVisibilityReason
): string => {
  if (reason === "PUBLIC") {
    return "Khách hàng có thể xem hồ sơ gian hàng của bạn.";
  }
  if (reason === "PENDING_APPROVAL") {
    return "Hồ sơ đã đủ thông tin và sẽ public sau khi Seller được duyệt.";
  }
  if (reason === "ENFORCED") {
    return "Gian hàng đang được ẩn trong thời gian Seller bị hạn chế.";
  }
  return "Hồ sơ sẽ public khi đủ các trường bắt buộc và Seller đủ điều kiện.";
};

interface BasicProfileFormProps {
  form: StoreProfileFormApi;
  slugLocked: boolean;
  status: StoreVisibilityStatus;
  visibilityReason: StoreVisibilityReason;
}

interface MediaProfileFormProps {
  avatarName: string;
  bannerName: string;
  disabled: boolean;
  form: StoreProfileFormApi;
  onAvatarNameChange: (name: string) => void;
  onBannerNameChange: (name: string) => void;
  onUploadingChange: (isUploading: boolean) => void;
}

interface ProfileActionsProps {
  canSubmit: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
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
  avatarUrl: profile?.avatarUrl ?? "",
  bannerUrl: profile?.bannerUrl ?? "",
  bio: profile?.bio ?? "",
  slugCustomized: Boolean(profile?.storeSlug),
  storeSlug: profile?.storeSlug ?? "",
  storefrontName: profile?.storefrontName ?? "",
});

const BasicProfileForm = ({
  form,
  slugLocked,
  status,
  visibilityReason,
}: BasicProfileFormProps) => (
  <FieldGroup className="gap-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <form.Field name="storefrontName">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>
                Tên gian hàng <span className="text-primary">*</span>
              </FieldLabel>
              <Input
                aria-invalid={isInvalid}
                className={FIELD_CLASS_NAME}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  const storefrontName = event.target.value;
                  field.handleChange(storefrontName);
                  if (
                    !form.state.values.slugCustomized &&
                    storefrontName.trim()
                  ) {
                    form.setFieldValue(
                      "storeSlug",
                      createStoreSlug(storefrontName)
                    );
                  }
                }}
                value={field.state.value}
              />
              <FieldDescription>
                Tên hiển thị trên trang gian hàng.
              </FieldDescription>
              {isInvalid ? (
                <FieldError errors={field.state.meta.errors} />
              ) : null}
            </Field>
          );
        }}
      </form.Field>
      <form.Field name="storeSlug">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>
                Đường dẫn gian hàng <span className="text-primary">*</span>
              </FieldLabel>
              <Input
                aria-invalid={isInvalid}
                className={FIELD_CLASS_NAME}
                disabled={slugLocked}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  form.setFieldValue("slugCustomized", true);
                }}
                value={field.state.value}
              />
              <FieldDescription>
                {slugLocked
                  ? "Đường dẫn được giữ nguyên để các liên kết đã chia sẻ không bị hỏng."
                  : "Địa chỉ công khai của gian hàng, chỉ dùng chữ thường, số và dấu gạch ngang."}
              </FieldDescription>
              {isInvalid ? (
                <FieldError errors={field.state.meta.errors} />
              ) : null}
            </Field>
          );
        }}
      </form.Field>
    </div>
    <form.Field name="bio">
      {(field) => {
        const isInvalid =
          field.state.meta.isTouched && !field.state.meta.isValid;
        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>
              Mô tả gian hàng <span className="text-primary">*</span>
            </FieldLabel>
            <Textarea
              aria-invalid={isInvalid}
              className={`min-h-32 resize-y leading-6 ${FIELD_CLASS_NAME}`}
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={field.state.value}
            />
            <FieldDescription>
              Nói rõ bạn cung cấp gì, dành cho ai và khách nhận được điều gì.
            </FieldDescription>
            {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
          </Field>
        );
      }}
    </form.Field>
    <Field>
      <FieldLabel>Trạng thái gian hàng</FieldLabel>
      <div className="flex h-10 items-center rounded-xl border border-border bg-background px-3">
        <Badge variant={status === "PUBLIC" ? "default" : "outline"}>
          {getStoreVisibilityLabel(visibilityReason)}
        </Badge>
      </div>
      <FieldDescription>
        {getStoreVisibilityDescription(visibilityReason)}
      </FieldDescription>
    </Field>
  </FieldGroup>
);

const MediaProfileForm = ({
  avatarName,
  bannerName,
  disabled,
  form,
  onAvatarNameChange,
  onBannerNameChange,
  onUploadingChange,
}: MediaProfileFormProps) => (
  <div className="flex flex-col gap-4">
    <div>
      <h3 className="font-semibold">Hình ảnh gian hàng</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Thêm ảnh đại diện bắt buộc và ảnh bìa tùy chọn để khách nhận ra gian
        hàng của bạn.
      </p>
    </div>
    <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <form.Field name="avatarUrl">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <SellerLogoUploader
                  disabled={disabled}
                  fileName={avatarName}
                  logoUrl={field.state.value}
                  onLogoChange={(value) => {
                    field.handleChange(value.url);
                    onAvatarNameChange(value.name);
                  }}
                  onUploadingChange={onUploadingChange}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            );
          }}
        </form.Field>
        <p className="text-xs text-muted-foreground">Ảnh đại diện *</p>
      </div>
      <div className="flex flex-col gap-2">
        <form.Field name="bannerUrl">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <SellerBannerUploader
                  bannerUrl={field.state.value}
                  disabled={disabled}
                  fileName={bannerName}
                  onBannerChange={(value) => {
                    field.handleChange(value.url);
                    onBannerNameChange(value.name);
                  }}
                  onUploadingChange={onUploadingChange}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            );
          }}
        </form.Field>
        <p className="text-xs text-muted-foreground">Ảnh bìa tùy chọn</p>
      </div>
    </div>
  </div>
);

const ProfileActions = ({
  canSubmit,
  isSaving,
  isSubmitting,
  onCancel,
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
      disabled={isSaving || isSubmitting || !canSubmit}
      type="submit"
      variant="outline"
    >
      Lưu nháp
    </Button>
    <Button disabled={isSaving || isSubmitting || !canSubmit} type="submit">
      {isSaving ? (
        <SpinnerIcon className="animate-spin" data-icon="inline-start" />
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
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative h-28 overflow-hidden bg-linear-to-br from-primary/30 via-primary/10 to-muted">
          {bannerUrl ? (
            <img
              alt="Ảnh bìa gian hàng"
              className="size-full object-cover"
              src={bannerUrl}
            />
          ) : null}
          <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
        </div>
        <div className="relative p-4 pt-0">
          <div className="-mt-7 flex size-14 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-primary text-primary-foreground shadow-sm">
            {avatarUrl ? (
              <img
                alt="Ảnh đại diện gian hàng"
                className="size-full object-cover"
                src={avatarUrl}
              />
            ) : (
              <StorefrontIcon className="size-6" />
            )}
          </div>
          <p className="mt-3 font-bold tracking-tight">
            {name || "Tên gian hàng của bạn"}
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
            /{slug || "duong-dan-gian-hang"}
          </p>
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {description || "Mô tả gian hàng sẽ hiển thị ở đây."}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const CompletionCard = ({ draft }: { draft: StoreProfileDraft }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Trạng thái hồ sơ</CardTitle>
      <CardDescription>
        Hoàn thiện các trường bắt buộc để public hồ sơ.
      </CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-3 text-sm">
      {[
        {
          done: Boolean(draft.storefrontName.trim()),
          label: "Tên gian hàng",
        },
        {
          done: Boolean(draft.storeSlug.trim()),
          label: "Đường dẫn gian hàng",
        },
        { done: Boolean(draft.bio?.trim()), label: "Mô tả gian hàng" },
        { done: Boolean(draft.avatarUrl), label: "Ảnh đại diện" },
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

interface StoreProfileEditorProps {
  onPreview: () => void;
  onSaved: () => void;
  profile: StoreProfileData | null;
  slugLocked: boolean;
  status: StoreVisibilityStatus;
  visibilityReason: StoreVisibilityReason;
}

const StoreProfileEditor = ({
  onPreview,
  onSaved,
  profile,
  slugLocked,
  status,
  visibilityReason,
}: StoreProfileEditorProps) => {
  const [savedDraft, setSavedDraft] = useState(() => createDraft(profile));
  const [avatarName, setAvatarName] = useState("");
  const [bannerName, setBannerName] = useState("");
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const updateProfileMutation = useMutation(
    orpc.sellerStore.updateProfile.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Không thể lưu hồ sơ gian hàng");
      },
    })
  );

  const profileForm = useForm<
    StoreProfileFormValues,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    FormValidateOrFn<StoreProfileFormValues>,
    undefined,
    undefined,
    undefined,
    undefined,
    unknown
  >({
    defaultValues: savedDraft,
    onSubmit: async ({ value }) => {
      const { profile: savedProfile } = await updateProfileMutation.mutateAsync(
        {
          avatarUrl: value.avatarUrl.trim(),
          bannerUrl: value.bannerUrl.trim(),
          bio: value.bio.trim(),
          storeSlug: value.storeSlug.trim(),
          storefrontName: value.storefrontName.trim(),
        }
      );
      const nextDraft: StoreProfileDraft = {
        ...value,
        avatarUrl: savedProfile.avatarUrl ?? "",
        bannerUrl: savedProfile.bannerUrl ?? "",
        bio: savedProfile.bio ?? "",
        slugCustomized: true,
        storeSlug: savedProfile.storeSlug,
        storefrontName: savedProfile.storefrontName,
      };
      setSavedDraft(nextDraft);
      profileForm.reset(nextDraft);
      toast.success("Đã lưu hồ sơ gian hàng");
      onSaved();
    },
    onSubmitInvalid: () => {
      toast.error("Vui lòng nhập đủ thông tin và thêm ảnh đại diện");
    },
    validators: { onSubmit: storeProfileFormSchema },
  });
  const draft = useStore(profileForm.store, (state) => state.values);

  const handleCancel = () => {
    profileForm.reset(savedDraft);
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
            <EyeIcon data-icon="inline-start" />
            Xem trước gian hàng
          </Button>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin gian hàng</CardTitle>
            <CardDescription>
              Hoàn thiện hồ sơ và diện mạo để khách hàng có thể xem gian hàng.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            <form
              id="store-profile-form"
              onSubmit={async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await profileForm.handleSubmit();
              }}
            >
              <BasicProfileForm
                form={profileForm}
                slugLocked={slugLocked}
                status={status}
                visibilityReason={visibilityReason}
              />
              <div className="border-t border-border/60 pt-6">
                <MediaProfileForm
                  avatarName={avatarName}
                  bannerName={bannerName}
                  disabled={updateProfileMutation.isPending || isMediaUploading}
                  form={profileForm}
                  onAvatarNameChange={setAvatarName}
                  onBannerNameChange={setBannerName}
                  onUploadingChange={setIsMediaUploading}
                />
              </div>
              <profileForm.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <ProfileActions
                    canSubmit={canSubmit}
                    isSaving={
                      updateProfileMutation.isPending || isMediaUploading
                    }
                    isSubmitting={isSubmitting}
                    onCancel={handleCancel}
                  />
                )}
              </profileForm.Subscribe>
            </form>
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
      slugLocked={profileQuery.data.slugLocked}
      status={profileQuery.data.status}
      visibilityReason={profileQuery.data.visibilityReason}
    />
  );
};
