import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avin/ui/components/avatar";
import { Badge } from "@avin/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { ArrowLeft, MapPin, SealCheck } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

const STATUS_LABELS = {
  ACTIVE: "Đang hoạt động",
  REMOVED_FOR_FRAUD: "Đã gỡ vì gian lận",
  SUSPENDED_PENDING_REVIEW: "Tạm ngưng, chờ xem xét",
  WITHDRAWAL_PENDING: "Đang chờ rút khỏi chương trình",
  WITHDRAWN: "Đã rút khỏi chương trình",
} as const;

const TIER_LABELS = {
  BRONZE: "Đồng",
  DIAMOND: "Kim cương",
  GOLD: "Vàng",
  NORMAL: "Normal",
  SILVER: "Bạc",
  VIP: "VIP",
} as const;

const money = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});
const providerDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
});
const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return "Đang cập nhật";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : providerDateFormatter.format(date);
};
const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/u)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AV";

interface Channels {
  avatarUrl?: string;
  facebookUrl?: string;
  hotline?: string;
  telegramCommunityUrl?: string;
  tiktokUrl?: string;
  websiteUrl?: string;
  youtubeUrl?: string;
  zalo?: string;
}

export const ProviderPublicProfilePage = () => {
  const { slug } = useParams({ from: "/(public)/avin-check/provider/$slug" });
  const profileQuery = useQuery(
    orpc.protection.publicProfile.queryOptions({ input: { slug } })
  );

  if (profileQuery.isPending) {
    return (
      <section className="mx-auto max-w-3xl py-16 text-center text-muted-foreground">
        Đang tải hồ sơ đối tác...
      </section>
    );
  }
  if (profileQuery.isError) {
    return (
      <section className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-bold text-3xl">Không tìm thấy hồ sơ đối tác</h1>
        <p className="mt-3 text-muted-foreground">
          Hồ sơ có thể chưa được phát hành hoặc đường dẫn không còn hợp lệ.
        </p>
      </section>
    );
  }

  const profile = profileQuery.data;
  const channels = (profile.officialChannels ?? {}) as Channels;
  const tier =
    TIER_LABELS[profile.tier as keyof typeof TIER_LABELS] ?? profile.tier;

  return (
    <section
      aria-labelledby="provider-public-profile-title"
      className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10"
    >
      <Link
        className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-sm hover:text-foreground"
        to="/avin-check"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Quay lại
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="outline">
          Avin Check · {STATUS_LABELS[profile.status]}
        </Badge>
        <span className="font-mono text-muted-foreground text-xs">
          {profile.profileSlug}
        </span>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="items-center border-b bg-primary/5 text-center">
          <Avatar className="size-24 border-2 border-primary/30">
            <AvatarImage alt={profile.displayName} src={channels.avatarUrl} />
            <AvatarFallback>{initials(profile.displayName)}</AvatarFallback>
          </Avatar>
          <div className="mt-2 flex items-center gap-2">
            <CardTitle className="text-2xl" id="provider-public-profile-title">
              {profile.displayName}
            </CardTitle>
            <SealCheck
              aria-label="Đã xác minh"
              className="size-6 text-primary"
              weight="fill"
            />
          </div>
          <CardDescription>
            <MapPin aria-hidden="true" className="mr-1 inline size-4" />
            {profile.location || "Địa điểm chưa cập nhật"} · Xác minh{" "}
            {formatDate(profile.verifiedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div
              className={
                profile.tier === "NORMAL" ? "p-3" : "rounded-xl border p-3"
              }
            >
              <p className="text-muted-foreground text-xs">Hạng</p>
              <p className="mt-1 font-bold text-primary">{tier}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-muted-foreground text-xs">Bond chính xác</p>
              <p className="mt-1 font-semibold">
                {money.format(profile.recognizedBondAmount)}
              </p>
            </div>
            <div className="rounded-xl border p-3 sm:col-span-2">
              <p className="text-muted-foreground text-xs">
                Hạn mức khuyến nghị
              </p>
              <p className="mt-1 font-semibold">
                ≤ {money.format(profile.recommendedTransactionLimit)}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border p-4">
              <h2 className="font-semibold text-sm">Kênh liên hệ</h2>
              <div className="mt-3 grid gap-2 text-sm">
                {(
                  [
                    ["Hotline", channels.hotline],
                    ["Zalo", channels.zalo],
                    ["Facebook", channels.facebookUrl],
                    ["Telegram", channels.telegramCommunityUrl],
                    ["TikTok", channels.tiktokUrl],
                    ["YouTube", channels.youtubeUrl],
                    ["Website", channels.websiteUrl],
                  ] as const
                ).map(([label, value]) =>
                  value ? (
                    <a
                      className="truncate text-primary underline underline-offset-4"
                      href={
                        label === "Zalo"
                          ? `https://zalo.me/${value.replaceAll(/\s+/gu, "")}`
                          : value
                      }
                      key={label}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {label}: {value}
                    </a>
                  ) : null
                )}
              </div>
            </div>
            <div className="rounded-2xl border p-4">
              <h2 className="font-semibold text-sm">
                Tài khoản ngân hàng đã đăng ký
              </h2>
              <p className="mt-1 text-muted-foreground text-xs">
                Đối tác đã đồng ý công khai toàn bộ số tài khoản.
              </p>
              <div className="mt-3 grid gap-2">
                {(profile.registeredBankAccounts ?? []).map((account) => (
                  <div
                    className="rounded-xl bg-muted/40 p-3 text-sm"
                    key={`${account.bankCode}-${account.accountNumber}`}
                  >
                    <p className="font-semibold">{account.accountName}</p>
                    <p className="font-mono">{account.accountNumber}</p>
                    <p className="text-muted-foreground text-xs">
                      {account.bankCode}
                      {account.isPrimary ? " · Tài khoản chính" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <h2 className="font-semibold text-sm">Dịch vụ cung cấp</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
              {profile.services}
            </p>
          </div>
        </CardContent>
      </Card>

      {profile.relatedWarnings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Cảnh báo công khai liên quan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {profile.relatedWarnings.map((warning) => (
              <a
                className="rounded-xl border p-3 text-primary underline"
                href={warning.publicPath}
                key={warning.publicSlug}
              >
                {warning.publicSlug}
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {profile.history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử phiên bản hồ sơ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {profile.history.map((version) => (
              <div
                className="flex flex-wrap justify-between gap-2 rounded-xl border p-3"
                key={version.versionNumber}
              >
                <span>
                  {version.versionNumber}.{" "}
                  {TIER_LABELS[version.tier as keyof typeof TIER_LABELS] ??
                    version.tier}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatDate(version.publishedAt)} · Bond{" "}
                  {money.format(version.recognizedBondAmount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
};
