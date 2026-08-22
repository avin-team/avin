import { Badge } from "@avin/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  CheckCircle,
  LockKey,
  PaperPlaneTilt,
  SealCheck,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

const PROFILE_STATUS_LABELS = {
  ACTIVE: "Đang hoạt động",
  REMOVED_FOR_FRAUD: "Đã gỡ vì gian lận",
  SUSPENDED_PENDING_REVIEW: "Tạm ngưng, chờ xem xét",
  WITHDRAWAL_PENDING: "Đang chờ rút khỏi chương trình",
  WITHDRAWN: "Đã rút khỏi chương trình",
} as const;

const RISK_STATUS_LABELS = {
  CORRECTED: "Đã cập nhật",
  PUBLISHED: "Đã công khai",
  UNDER_VERIFICATION: "Đang xác minh",
} as const;

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

const formatDateVi = (dateStr: string | null | undefined): string => {
  if (!dateStr) {
    return "Đang cập nhật";
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getInitials = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) {
    return "AV";
  }
  const parts = trimmed.split(/\s+/u);
  const first = parts[0]?.[0] ?? "A";
  const last = parts.at(-1)?.[0] ?? "V";
  return `${first}${last}`.toUpperCase();
};

interface OfficialChannelsData {
  avatarUrl?: string;
  bioShop?: string;
  facebookId?: string;
  facebookUrl?: string;
  note?: string;
  telegramCommunityUrl?: string;
  websiteUrl?: string;
  zalo?: string;
}

const ProviderHeaderSection = ({
  channels,
  displayName,
  profileId,
}: {
  channels: OfficialChannelsData;
  displayName: string;
  profileId: string;
}) => {
  const zaloNumber = channels.zalo?.trim() ?? "";
  const zaloUrl = zaloNumber
    ? `https://zalo.me/${zaloNumber.replaceAll(/\s+/gu, "")}`
    : "#";
  const telegramUrl =
    channels.telegramCommunityUrl?.trim() ||
    "https://t.me/avin_check_community";

  return (
    <div className="border-border/50 border-b bg-card p-6 text-center space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-xs text-muted-foreground">
          Mã hồ sơ: #{profileId.slice(0, 8)}
        </span>
        <span className="font-bold text-xs text-primary">
          Avin Check Certified
        </span>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative size-24 overflow-hidden rounded-full border-3 border-primary/30 bg-primary/10 shadow-md">
          {channels.avatarUrl ? (
            <img
              alt={displayName}
              className="size-full object-cover"
              src={channels.avatarUrl}
            />
          ) : (
            <div className="flex size-full items-center justify-center font-black text-primary text-2xl">
              {getInitials(displayName)}
            </div>
          )}
        </div>

        <div className="mt-3.5 flex items-center justify-center gap-1.5">
          <h1
            className="font-extrabold text-foreground text-2xl sm:text-3xl tracking-tight"
            id="provider-public-profile-title"
          >
            {displayName}
          </h1>
          <SealCheck className="size-6 text-primary" weight="fill" />
        </div>

        {channels.note && (
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {channels.note}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <a
          className="inline-flex items-center gap-2 rounded-xl bg-[#0068FF] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#0055d4] hover:shadow-md"
          href={zaloUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <CheckCircle className="size-4.5" weight="bold" />
          Check Zalo Real
        </a>
        <a
          className="inline-flex items-center gap-2 rounded-xl bg-[#229ED9] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1a8bc2] hover:shadow-md"
          href={telegramUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <PaperPlaneTilt className="size-4.5" weight="fill" />
          Cộng đồng check
        </a>
      </div>
    </div>
  );
};

const ProviderVerificationBox = ({
  channels,
}: {
  channels: OfficialChannelsData;
}) => (
  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-3">
    <h2 className="font-bold text-sm text-foreground">Thông tin Xác Minh:</h2>
    <div className="space-y-2 text-xs">
      <div className="flex items-start gap-2">
        <span className="font-semibold text-foreground shrink-0">Fb (C):</span>
        {channels.facebookUrl ? (
          <a
            className="font-mono text-primary font-medium hover:underline truncate"
            href={channels.facebookUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {channels.facebookId || "Xem Facebook chính chủ"}
          </a>
        ) : (
          <span className="font-mono text-primary font-medium">
            {channels.facebookId || "Chưa cập nhật"}
          </span>
        )}
      </div>
      <div className="flex items-start gap-2">
        <span className="font-semibold text-foreground shrink-0">
          Inbox Zalo:
        </span>
        <span className="font-mono text-primary font-bold">
          {channels.zalo || "Chưa cấu hình"}
        </span>
      </div>
      {channels.bioShop ? (
        <div className="flex items-start gap-2">
          <span className="font-semibold text-foreground shrink-0">
            Bio Shop:
          </span>
          <span className="font-mono text-foreground font-medium">
            {channels.bioShop}
          </span>
        </div>
      ) : null}
      {channels.websiteUrl ? (
        <div className="flex items-start gap-2">
          <span className="font-semibold text-foreground shrink-0">
            Website:
          </span>
          <a
            className="text-primary hover:underline truncate"
            href={channels.websiteUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {channels.websiteUrl}
          </a>
        </div>
      ) : null}
    </div>
  </div>
);

const ProviderTierBox = ({
  isRoyal,
  limit,
  verifiedDate,
}: {
  isRoyal: boolean;
  limit: number;
  verifiedDate: string | null | undefined;
}) => (
  <div className="relative rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-2">
    <h2 className="font-bold text-sm text-foreground">
      {isRoyal ? "Hồ Sơ Hạng Royal" : "Hồ Sơ Hạng Bạc"}:
    </h2>
    <div className="space-y-1.5 text-xs">
      <div>
        <span className="text-muted-foreground">Hỗ trợ: </span>
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          Xuất sắc
        </span>
      </div>
      <div>
        <span className="text-muted-foreground">Điểm tín nhiệm: </span>
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          100/100
        </span>
      </div>
      <div>
        <span className="text-muted-foreground">Ngày tham gia: </span>
        <span className="font-medium text-foreground">
          {formatDateVi(verifiedDate)}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground">Khuyến nghị giao dịch: </span>
        <span className="font-bold text-blue-600 dark:text-blue-400">
          {limit > 0
            ? `dưới ${vndFormatter.format(limit)}`
            : "theo hạn mức ký quỹ"}
        </span>
      </div>
    </div>
    <div className="absolute right-4 top-4">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-xs">
        <LockKey className="size-7" weight="fill" />
      </div>
    </div>
  </div>
);

export const ProviderPublicProfilePage = () => {
  const { slug } = useParams({ from: "/(public)/avin-check/provider/$slug" });
  const profileQuery = useQuery(
    orpc.protection.publicProfile.queryOptions({ input: { slug } })
  );

  if (profileQuery.isPending) {
    return (
      <section className="mx-auto max-w-3xl py-16 text-center text-muted-foreground">
        <output aria-live="polite">Đang tải hồ sơ xác minh Đối tác...</output>
      </section>
    );
  }

  if (profileQuery.isError) {
    return (
      <section className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-bold text-3xl">Không tìm thấy profile Provider</h1>
        <p className="mt-3 text-muted-foreground">
          Profile có thể chưa được phát hành hoặc đường dẫn không còn hợp lệ.
        </p>
      </section>
    );
  }

  const profile = profileQuery.data;
  const officialChannels = (profile.officialChannels ??
    {}) as OfficialChannelsData;
  const isRoyal = profile.recommendedTransactionLimit >= 50_000_000;

  return (
    <section
      aria-labelledby="provider-public-profile-title"
      className="mx-auto flex max-w-3xl flex-col gap-8 py-10 px-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge
          className="border-primary/40 bg-primary/10 text-primary text-xs"
          variant="outline"
        >
          Avin Check · {PROFILE_STATUS_LABELS[profile.status]}
        </Badge>
        <span className="text-muted-foreground text-xs font-mono">
          Slug: {profile.profileSlug}
        </span>
      </div>

      {profile.statusReason ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-foreground">
          {profile.statusReason}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xl">
        <ProviderHeaderSection
          channels={officialChannels}
          displayName={profile.displayName}
          profileId={profile.id}
        />

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <ProviderVerificationBox channels={officialChannels} />
          <ProviderTierBox
            isRoyal={isRoyal}
            limit={profile.recommendedTransactionLimit}
            verifiedDate={profile.verifiedAt || profile.publishedAt}
          />
        </div>

        <div className="px-5 pb-5">
          <div className="relative rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 min-h-40">
            <h2 className="font-bold text-sm text-foreground mb-3">
              Dịch vụ cung cấp:
            </h2>
            <div className="whitespace-pre-wrap font-sans text-xs text-foreground leading-relaxed">
              {profile.services}
            </div>

            <div className="mt-6 flex justify-end">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-[11px] font-extrabold uppercase text-destructive/80 rotate-[-2deg] shadow-2xs">
                <LockKey className="size-3.5" weight="fill" />
                HỒ SƠ XÁC MINH UY TÍN AVIN CHECK
              </div>
            </div>
          </div>
        </div>
      </div>

      {profile.relatedWarnings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Cảnh báo công khai liên quan</CardTitle>
            <CardDescription>
              Chỉ các Risk Report đã được công khai mới được liên kết ở đây.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {profile.relatedWarnings.map((warning) => (
              <a
                className="flex flex-wrap justify-between gap-2 rounded-xl border p-3 text-primary underline underline-offset-4"
                href={warning.publicPath}
                key={warning.publicSlug}
              >
                <span>{warning.publicSlug}</span>
                <span className="text-muted-foreground no-underline">
                  {RISK_STATUS_LABELS[warning.status]}
                </span>
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {profile.history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử phiên bản hồ sơ</CardTitle>
            <CardDescription>
              Đối chiếu trạng thái và các phiên bản đã phát hành bởi Avin Check.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {profile.history.map((version) => (
              <div
                className="flex flex-wrap justify-between gap-2 rounded-xl border p-3"
                key={version.versionNumber}
              >
                <span>
                  Phiên bản {version.versionNumber} ·{" "}
                  {PROFILE_STATUS_LABELS[version.status]}
                </span>
                <span className="text-muted-foreground text-right text-xs">
                  <span className="block">
                    {formatDateVi(version.publishedAt)}
                  </span>
                  <span className="block">
                    Hạn mức:{" "}
                    {vndFormatter.format(version.recommendedTransactionLimit)}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
};
