import { Button } from "@avin/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avin/ui/components/dialog";
import { Label } from "@avin/ui/components/label";
import { Textarea } from "@avin/ui/components/textarea";
import { useState } from "react";

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
  const [reason, setReason] = useState("");

  if (!action || !listing) {
    return null;
  }

  const copy = ACTION_COPY[action];
  const listingTitle = listing.title?.trim() || "Untitled Listing";

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setReason("");
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

        <div className="grid gap-2 py-2">
          <Label htmlFor="listing-moderation-reason">
            Lý do xử lý (Bắt buộc)
          </Label>
          <Textarea
            aria-required="true"
            id="listing-moderation-reason"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ghi rõ căn cứ chính sách hoặc lý do khôi phục Listing..."
            rows={4}
            value={reason}
          />
        </div>

        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Hủy
          </Button>
          <Button
            disabled={pending || reason.trim().length === 0}
            onClick={() => onConfirm(reason.trim())}
            type="button"
            variant={action === "ARCHIVE" ? "destructive" : "default"}
          >
            {pending ? "Đang xử lý..." : getModerationActionLabel(action)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
