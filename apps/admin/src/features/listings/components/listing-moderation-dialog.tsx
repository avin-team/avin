import { Button } from "@avin/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avin/ui/components/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Textarea } from "@avin/ui/components/textarea";
import { useForm } from "@tanstack/react-form";

import { listingModerationFormSchema } from "../schemas/listing-moderation-form-schema";
import { getModerationActionLabel } from "../workflow";
import type { ModerationAction } from "../workflow";

interface ModerationListing {
  readonly id: string;
  readonly status: string;
  readonly title: string | null;
}

interface ListingModerationDialogProps {
  readonly action: ModerationAction | null;
  readonly listing: ModerationListing | null;
  readonly onConfirm: (reason: string) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly pending: boolean;
}

const ACTION_COPY: Record<
  ModerationAction,
  { description: string; title: string }
> = {
  ARCHIVE: {
    description:
      "Listing sẽ được giữ lại để bảo toàn lịch sử và không thể khôi phục sau thao tác này.",
    title: "Lưu trữ Listing vĩnh viễn?",
  },
  HIDE: {
    description:
      "Listing sẽ biến mất khỏi các trang công khai. Seller không thể tự khôi phục Listing bị ẩn.",
    title: "Ẩn Listing khỏi sàn?",
  },
  RESTORE: {
    description:
      "Listing chỉ được công khai lại nếu Seller, danh mục và toàn bộ publication gate vẫn hợp lệ.",
    title: "Khôi phục Listing công khai?",
  },
};

export const ListingModerationDialog = ({
  action,
  listing,
  onConfirm,
  onOpenChange,
  open,
  pending,
}: ListingModerationDialogProps) => {
  const moderationForm = useForm({
    defaultValues: { reason: "" },
    onSubmit: ({ value }) => {
      onConfirm(value.reason.trim());
      moderationForm.reset();
    },
    validators: { onSubmit: listingModerationFormSchema },
  });

  if (!action || !listing) {
    return null;
  }

  const copy = ACTION_COPY[action];
  const listingTitle = listing.title?.trim() || "Untitled Listing";

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          moderationForm.reset();
        }
        onOpenChange(nextOpen);
      }}
      open={open}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.description} <strong>{listingTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <form
          id="listing-moderation-form"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await moderationForm.handleSubmit();
          }}
        >
          <FieldGroup className="gap-2 py-2">
            <moderationForm.Field name="reason">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Lý do xử lý (Bắt buộc)
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      id={field.name}
                      maxLength={2000}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Ghi rõ căn cứ chính sách hoặc lý do khôi phục Listing..."
                      rows={4}
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </moderationForm.Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <moderationForm.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={!canSubmit || isSubmitting || pending}
                  form="listing-moderation-form"
                  type="submit"
                  variant={action === "ARCHIVE" ? "destructive" : "default"}
                >
                  {isSubmitting || pending
                    ? "Đang xử lý..."
                    : getModerationActionLabel(action)}
                </Button>
              )}
            </moderationForm.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
