import { Input } from "@avin/ui/components/input";
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { useState } from "react";

export interface OptionalDetailsState {
  facebookUrl: string;
  incidentDate: string;
  ongoing: boolean;
  phoneNumber: string;
  telegramUrl: string;
  tiktokUrl: string;
}

interface OptionalDetailsSectionProps {
  dateLabel?: string;
  onChange: (updates: Partial<OptionalDetailsState>) => void;
  values: OptionalDetailsState;
}

export const OptionalDetailsSection = ({
  dateLabel = "Ngày xảy ra",
  onChange,
  values,
}: OptionalDetailsSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasFilledData = Boolean(
    values.facebookUrl ||
    values.tiktokUrl ||
    values.telegramUrl ||
    values.phoneNumber ||
    values.ongoing
  );

  return (
    <div className="rounded-xl border bg-muted/20 transition-all">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between p-4 text-left font-medium text-sm hover:text-primary focus:outline-none"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        <div className="flex items-center gap-2">
          <span>Bổ sung thông tin đối tượng (tuỳ chọn)</span>
          {hasFilledData && !isOpen ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
              Đã nhập
            </span>
          ) : null}
        </div>
        {isOpen ? (
          <CaretUpIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        ) : (
          <CaretDownIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        )}
      </button>

      {isOpen ? (
        <div className="grid gap-4 border-t p-4 pt-4 sm:grid-cols-2">
          <label
            className="grid gap-1.5 font-medium text-sm"
            htmlFor="optional-facebook"
          >
            Link Facebook đối tượng
            <Input
              id="optional-facebook"
              onChange={(e) => onChange({ facebookUrl: e.target.value })}
              placeholder="https://facebook.com/..."
              value={values.facebookUrl}
            />
          </label>

          <label
            className="grid gap-1.5 font-medium text-sm"
            htmlFor="optional-tiktok"
          >
            Link TikTok đối tượng
            <Input
              id="optional-tiktok"
              onChange={(e) => onChange({ tiktokUrl: e.target.value })}
              placeholder="https://tiktok.com/@..."
              value={values.tiktokUrl}
            />
          </label>

          <label
            className="grid gap-1.5 font-medium text-sm"
            htmlFor="optional-telegram"
          >
            Link Telegram đối tượng
            <Input
              id="optional-telegram"
              onChange={(e) => onChange({ telegramUrl: e.target.value })}
              placeholder="https://t.me/... hoặc username"
              value={values.telegramUrl}
            />
          </label>

          <label
            className="grid gap-1.5 font-medium text-sm"
            htmlFor="optional-phone"
          >
            Số điện thoại / Zalo đối tượng
            <Input
              autoComplete="tel"
              id="optional-phone"
              onChange={(e) => onChange({ phoneNumber: e.target.value })}
              placeholder="0987654321"
              value={values.phoneNumber}
            />
          </label>

          <label
            className="grid gap-1.5 font-medium text-sm"
            htmlFor="optional-incident-date"
          >
            {dateLabel}
            <Input
              id="optional-incident-date"
              onChange={(e) => onChange({ incidentDate: e.target.value })}
              type="date"
              value={values.incidentDate}
            />
          </label>

          <div className="flex items-center gap-2 pt-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                checked={values.ongoing}
                className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                onChange={(e) => onChange({ ongoing: e.target.checked })}
                type="checkbox"
              />
              <span>Sự việc vẫn đang tiếp diễn</span>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
};
