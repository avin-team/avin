import { Button, buttonVariants } from "@avin/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@avin/ui/components/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avin/ui/components/empty";
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  ArrowLeft,
  ArrowRight,
  Bank,
  CaretRight,
  CheckCircle,
  Copy,
  CurrencyCircleDollar,
  Export,
  FacebookLogo,
  Flag,
  Globe,
  Phone,
  QrCode,
  SealCheck,
  ShieldCheck,
  ShieldWarning,
  TelegramLogo,
  TiktokLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";

import type { client } from "@/utils/orpc";
import { orpc } from "@/utils/orpc";

import { ProviderTierFrame } from "../components/provider-tier-frame";
import type { ProviderTier } from "../data/provider-tier-constants";
import { TIER_ICON_IMAGES } from "../data/provider-tier-constants";

export interface ProviderDetailData {
  bio?: string;
  displayName: string;
  history: {
    publishedAt: string;
    recognizedBondAmount: number;
    tier: ProviderTier;
    versionNumber: number;
  }[];
  id: string;
  location: string;
  officialChannels: {
    additionalZalos?: string[];
    avatarUrl?: string;
    bioShopId?: string;
    bioShopUrl?: string;
    facebookId?: string;
    facebookSecondaryId?: string;
    facebookSecondaryUrl?: string;
    facebookUrl?: string;
    facebooks?: {
      id?: string;
      isPrimary?: boolean;
      label?: string;
      url: string;
    }[];
    hotline?: string;
    qrCodeUrl?: string;
    telegramCommunityUrl?: string;
    tiktokUrl?: string;
    websiteUrl?: string;
    youtubeUrl?: string;
    zalo?: string;
    zaloSecondary?: string;
    zalos?: {
      isPrimary?: boolean;
      label?: string;
      phone: string;
    }[];
  };
  profileSlug: string;
  publicUrl: string;
  publishedAt: string;
  recognizedBondAmount: number;
  recommendedTransactionLimit: number;
  registeredBankAccounts: {
    accountName: string;
    accountNumber: string;
    bankCode: string;
    isPrimary: boolean;
  }[];
  relatedWarnings: {
    publicPath: string;
    publicSlug: string;
    publishedAt: string;
    status: string;
    type: string;
  }[];
  services: string;
  source?: string;
  status:
    | "ACTIVE"
    | "SUSPENDED_PENDING_REVIEW"
    | "WITHDRAWAL_PENDING"
    | "WITHDRAWN"
    | "REMOVED_FOR_FRAUD";
  tier: ProviderTier;
  verifiedAt: string;
}

type PublicProfileApiData = NonNullable<
  Awaited<ReturnType<typeof client.protection.publicProfile>>
>;

const vndFormatter = new Intl.NumberFormat("vi-VN");

const TIER_NAMES: Record<string, string> = {
  BRONZE: "Đồng",
  DIAMOND: "Kim cương",
  GOLD: "Vàng",
  NORMAL: "Thường",
  PLATINUM: "Bạch kim",
  SILVER: "Bạc",
  VIP: "VIP",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đã xác minh",
  DELISTED: "Đã gỡ niêm yết",
  SUSPENDED: "Đang tạm dừng",
};

const formatMonthYear = (verifiedAt?: string) => {
  if (!verifiedAt) {
    return "05.2024";
  }
  const d = new Date(verifiedAt);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${m}.${y}`;
};

const ProviderHeroCard = ({
  onShare,
  provider,
  shareCopied,
}: {
  onShare: () => void;
  provider: ProviderDetailData;
  shareCopied: boolean;
}) => {
  const isVerified = provider.status === "ACTIVE";
  const isCheckscam = provider.source === "CHECKSCAM";

  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
        {/* Left: Avatar with Tier Frame and Information */}
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="shrink-0">
            <ProviderTierFrame
              className="size-36 sm:size-40"
              isVerified={isVerified}
              recognizedBondAmount={provider.recognizedBondAmount}
              recommendedTransactionLimit={provider.recommendedTransactionLimit}
              tier={provider.tier}
            >
              <img
                alt={provider.displayName}
                className="size-full object-cover"
                src={provider.officialChannels.avatarUrl}
              />
            </ProviderTierFrame>
          </div>

          <div className="space-y-2">
            <h1 className="font-extrabold text-3xl tracking-tight text-foreground sm:text-4xl">
              {provider.displayName}
            </h1>

            {provider.bio ? (
              <p className="font-semibold text-muted-foreground text-sm sm:text-base italic">
                {provider.bio}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5 sm:justify-start">
              <div className="inline-flex items-center gap-1.5 font-semibold text-primary text-sm">
                <SealCheck className="size-4" weight="fill" />
                <span>
                  {isVerified
                    ? "Danh tính đã xác minh"
                    : (STATUS_LABELS[provider.status] ?? provider.status)}
                </span>
              </div>

              {isCheckscam ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-semibold text-amber-600 text-xs dark:text-amber-400">
                  Nguồn: CheckScam
                </span>
              ) : null}
            </div>

            <p className="text-muted-foreground text-sm">Đối tác bảo chứng</p>

            <p className="text-muted-foreground text-xs">
              {provider.location} • Hoạt động từ{" "}
              {formatMonthYear(provider.verifiedAt)}
            </p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:min-w-44">
          {(() => {
            const mainZalo =
              provider.officialChannels.zalos?.find((z) => z.isPrimary)
                ?.phone ?? provider.officialChannels.zalo;
            return (
              <a
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#84cc16] px-6 font-bold text-black text-sm shadow-xs transition-all hover:bg-[#65a30d]"
                href={
                  mainZalo
                    ? `https://zalo.me/${mainZalo.replaceAll(/\s+/gu, "")}`
                    : `tel:${provider.officialChannels.hotline?.replaceAll(/\s+/gu, "") ?? ""}`
                }
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>Liên hệ</span>
                <ArrowRight className="size-4" />
              </a>
            );
          })()}

          <Button
            className="h-11 w-full rounded-2xl border-border/80 bg-background/50 px-5 font-semibold text-foreground text-sm hover:bg-muted"
            onClick={onShare}
            type="button"
            variant="outline"
          >
            {shareCopied ? (
              <>
                <CheckCircle className="size-4 text-[#84cc16]" weight="fill" />
                <span className="text-[#84cc16]">Đã chép link</span>
              </>
            ) : (
              <>
                <Export className="size-4" />
                <span>Chia sẻ hồ sơ</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 4-Column Metric Stat Bar */}
      <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border/80 pt-6 md:grid-cols-4">
        {/* Stat 1: Trạng thái */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-foreground">
            <ShieldCheck className="size-6" weight="regular" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Trạng thái</p>
            <p className="font-bold text-foreground text-sm sm:text-base">
              {STATUS_LABELS[provider.status] ?? provider.status}
            </p>
          </div>
        </div>

        {/* Stat 2: Hạng thành viên */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-foreground">
            <img
              alt={TIER_NAMES[provider.tier] ?? provider.tier}
              className="size-7.5 object-contain drop-shadow-xs"
              src={TIER_ICON_IMAGES[provider.tier] ?? TIER_ICON_IMAGES.BRONZE}
            />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Hạng thành viên</p>
            <p className="font-bold text-foreground text-sm sm:text-base">
              {TIER_NAMES[provider.tier] ?? provider.tier}
            </p>
          </div>
        </div>

        {/* Stat 3: Quỹ bảo chứng */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-foreground">
            <ShieldCheck className="size-6" weight="regular" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Quỹ bảo chứng</p>
            <p className="font-bold text-[#84cc16] text-sm sm:text-base">
              {vndFormatter.format(provider.recognizedBondAmount)} đ
            </p>
          </div>
        </div>

        {/* Stat 4: Khuyến nghị giao dịch */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-foreground">
            <CurrencyCircleDollar className="size-6" weight="regular" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              Khuyến nghị giao dịch
            </p>
            <p className="font-bold text-[#84cc16] text-sm sm:text-base">
              ≤ {vndFormatter.format(provider.recommendedTransactionLimit)} đ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const getProviderZalos = (
  channels: ProviderDetailData["officialChannels"]
): { isPrimary?: boolean; label?: string; phone: string }[] => {
  if (channels.zalos && channels.zalos.length > 0) {
    return channels.zalos;
  }
  const result: { isPrimary?: boolean; label?: string; phone: string }[] = [];
  if (channels.zalo) {
    result.push({
      isPrimary: true,
      label: "Inbox Zalo (Chính)",
      phone: channels.zalo,
    });
  }
  if (channels.zaloSecondary) {
    result.push({
      isPrimary: false,
      label: "Inbox Zalo (Phụ)",
      phone: channels.zaloSecondary,
    });
  }
  if (channels.additionalZalos) {
    for (const [idx, zNum] of channels.additionalZalos.entries()) {
      result.push({
        isPrimary: false,
        label: `Zalo khác #${idx + 1}`,
        phone: zNum,
      });
    }
  }
  return result;
};

const getProviderFacebooks = (
  channels: ProviderDetailData["officialChannels"]
): { id?: string; isPrimary?: boolean; label?: string; url: string }[] => {
  if (channels.facebooks && channels.facebooks.length > 0) {
    return channels.facebooks;
  }
  const result: {
    id?: string;
    isPrimary?: boolean;
    label?: string;
    url: string;
  }[] = [];
  if (channels.facebookUrl) {
    result.push({
      id: channels.facebookId,
      isPrimary: true,
      label: "Facebook (Chính)",
      url: channels.facebookUrl,
    });
  }
  if (channels.facebookSecondaryUrl) {
    result.push({
      id: channels.facebookSecondaryId,
      isPrimary: false,
      label: "Facebook (Phụ)",
      url: channels.facebookSecondaryUrl,
    });
  }
  return result;
};

const ProviderOfficialChannelsCard = ({
  channels,
}: {
  channels: ProviderDetailData["officialChannels"];
}) => {
  const zalos = getProviderZalos(channels);
  const facebooks = getProviderFacebooks(channels);

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base text-foreground sm:text-lg">
          Kênh liên hệ & Xác minh
        </h2>
        {channels.qrCodeUrl ? (
          <span className="font-medium text-xs text-muted-foreground">
            Có mã QR
          </span>
        ) : null}
      </div>

      <div className="mt-4 divide-y divide-border/60">
        {channels.hotline ? (
          <a
            className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
            href={`tel:${channels.hotline.replaceAll(/\s+/gu, "")}`}
          >
            <div className="flex items-center gap-3">
              <Phone className="size-4 text-muted-foreground" />
              <span>Hotline / Gọi điện</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-muted-foreground">
              <span>{channels.hotline}</span>
              <CaretRight className="size-4 text-muted-foreground" />
            </div>
          </a>
        ) : null}

        {zalos.map((zaloItem) => (
          <a
            className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
            href={`https://zalo.me/${zaloItem.phone.replaceAll(/\s+/gu, "")}`}
            key={zaloItem.phone}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex size-4 items-center justify-center rounded-full font-bold text-[0.6rem] text-white ${zaloItem.isPrimary ? "bg-blue-500" : "bg-sky-500"}`}
              >
                Z
              </span>
              <span className="flex items-center gap-1.5">
                <span>
                  {zaloItem.label ||
                    (zaloItem.isPrimary ? "Inbox Zalo (Chính)" : "Inbox Zalo")}
                </span>
                {zaloItem.isPrimary ? (
                  <span className="rounded-md bg-blue-500/15 px-1.5 py-0.2 font-semibold text-[0.65rem] text-blue-600 dark:text-blue-400">
                    Chính
                  </span>
                ) : null}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-muted-foreground">
              <span>{zaloItem.phone}</span>
              <CaretRight className="size-4 text-muted-foreground" />
            </div>
          </a>
        ))}

        {facebooks.map((fbItem) => (
          <a
            className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
            href={fbItem.url}
            key={fbItem.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="flex items-center gap-3">
              <FacebookLogo
                className={`size-4 ${fbItem.isPrimary ? "text-blue-600" : "text-blue-500"}`}
                weight="fill"
              />
              <span className="flex items-center gap-1.5">
                <span>
                  {fbItem.label ||
                    (fbItem.isPrimary ? "Facebook (Chính)" : "Facebook")}
                </span>
                {fbItem.isPrimary ? (
                  <span className="rounded-md bg-blue-500/15 px-1.5 py-0.2 font-semibold text-[0.65rem] text-blue-600 dark:text-blue-400">
                    Chính
                  </span>
                ) : null}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span>{fbItem.id ? `ID: ${fbItem.id}` : "Xem Facebook"}</span>
              <CaretRight className="size-4 text-muted-foreground" />
            </div>
          </a>
        ))}

        {channels.bioShopId || channels.bioShopUrl ? (
          <a
            className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
            href={channels.bioShopUrl ?? "#"}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="flex items-center gap-3">
              <Globe className="size-4 text-violet-500" />
              <span>Bio Shop</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span>
                {channels.bioShopId ? `Mã: ${channels.bioShopId}` : "Xem Shop"}
              </span>
              <CaretRight className="size-4 text-muted-foreground" />
            </div>
          </a>
        ) : null}

        {channels.telegramCommunityUrl ? (
          <a
            className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
            href={channels.telegramCommunityUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="flex items-center gap-3">
              <TelegramLogo className="size-4 text-sky-500" weight="fill" />
              <span>Cộng đồng Telegram</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>
                {channels.telegramCommunityUrl.replace("https://t.me/", "@")}
              </span>
              <CaretRight className="size-4 text-muted-foreground" />
            </div>
          </a>
        ) : null}

        {channels.websiteUrl ? (
          <a
            className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
            href={channels.websiteUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="flex items-center gap-3">
              <Globe className="size-4 text-emerald-500" />
              <span>Website dịch vụ</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Trang dịch vụ</span>
              <CaretRight className="size-4 text-muted-foreground" />
            </div>
          </a>
        ) : null}

        {channels.tiktokUrl ? (
          <a
            className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
            href={channels.tiktokUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="flex items-center gap-3">
              <TiktokLogo className="size-4 text-pink-500" />
              <span>TikTok</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Kênh TikTok</span>
              <CaretRight className="size-4 text-muted-foreground" />
            </div>
          </a>
        ) : null}

        {channels.youtubeUrl ? (
          <a
            className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
            href={channels.youtubeUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="flex items-center gap-3">
              <YoutubeLogo className="size-4 text-red-500" />
              <span>YouTube</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Kênh YouTube</span>
              <CaretRight className="size-4 text-muted-foreground" />
            </div>
          </a>
        ) : null}
      </div>

      {channels.qrCodeUrl ? (
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-border/60 pt-4">
          <div>
            <p className="font-semibold text-xs text-foreground">
              Mã QR Xác Minh
            </p>
            <p className="text-[0.7rem] text-muted-foreground">
              Quét để kết bạn & giao dịch đúng người
            </p>
          </div>
          <img
            alt="QR Code"
            className="size-20 rounded-xl border border-border bg-white object-contain p-1"
            src={channels.qrCodeUrl}
          />
        </div>
      ) : null}
    </div>
  );
};

const getDisplayAccounts = (
  accounts: ProviderDetailData["registeredBankAccounts"] | undefined,
  primaryAccount:
    | ProviderDetailData["registeredBankAccounts"][number]
    | undefined
): ProviderDetailData["registeredBankAccounts"] => {
  if (accounts && accounts.length > 0) {
    return accounts;
  }
  if (primaryAccount) {
    return [primaryAccount];
  }
  return [];
};

const isMomoAccount = (bankCode?: string) => {
  if (!bankCode) {
    return false;
  }
  const normalized = bankCode.trim().toUpperCase();
  return normalized === "MOMO" || normalized.includes("MOMO");
};

const ProviderBankCard = ({
  accounts,
  handleCopy,
  isCopied,
  onOpenQr,
  primaryAccount,
}: {
  accounts?: ProviderDetailData["registeredBankAccounts"];
  handleCopy: (text: string) => void;
  isCopied: (accountNumber: string) => boolean;
  onOpenQr?: (
    account: ProviderDetailData["registeredBankAccounts"][number]
  ) => void;
  primaryAccount?: ProviderDetailData["registeredBankAccounts"][number];
}) => {
  const displayAccounts = getDisplayAccounts(accounts, primaryAccount);

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base text-foreground sm:text-lg">
          Tài khoản nhận tiền ({displayAccounts.length})
        </h2>
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#84cc16] text-xs">
          <CheckCircle className="size-3.5" weight="fill" />
          Tài khoản đã xác minh
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {displayAccounts.map((account) => {
          const formattedAccountNumber = account.accountNumber.replaceAll(
            /(?<group>\d{4})(?=\d)/gu,
            "$<group> "
          );

          return (
            <div
              className="relative grid grid-cols-[6.5rem_1fr_auto] items-center gap-2.5 overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-3.5 pl-5 sm:grid-cols-[9.5rem_1fr_auto] sm:gap-4 sm:p-5 sm:pl-7 md:grid-cols-[10.5rem_1fr_auto]"
              key={`${account.bankCode}-${account.accountNumber}`}
            >
              {/* Left vertical accent bar */}
              {account.isPrimary ? (
                <div className="absolute top-2.5 bottom-2.5 left-0 w-1.5 rounded-r-full bg-[#84cc16]" />
              ) : null}

              {/* Left: Bank logo & name */}
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-[#84cc16]">
                  <Bank className="size-5" weight="fill" />
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
                  <span className="truncate font-extrabold text-sm text-foreground sm:text-base">
                    {account.bankCode}
                  </span>
                  {account.isPrimary ? (
                    <span className="shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-bold text-[0.65rem] text-emerald-600 dark:text-emerald-400">
                      Chính
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Middle: Account number & Account name (Left aligned) */}
              <div className="min-w-0 space-y-0.5 text-left">
                <p className="truncate font-mono font-black text-sm tracking-wider text-foreground sm:text-lg md:text-xl">
                  {formattedAccountNumber}
                </p>
                <p className="truncate font-semibold text-[0.7rem] text-muted-foreground uppercase sm:text-xs">
                  {account.accountName}
                </p>
              </div>

              {/* Right: Actions (VietQR & Copy) */}
              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                {!isMomoAccount(account.bankCode) && (
                  <Button
                    aria-label="Mở mã QR ngân hàng"
                    className="size-9 shrink-0 rounded-xl border-border/80 p-0 hover:bg-muted sm:size-10"
                    onClick={() => onOpenQr?.(account)}
                    size="icon"
                    variant="outline"
                  >
                    <QrCode className="size-4.5 text-muted-foreground sm:size-5" />
                  </Button>
                )}
                <Button
                  aria-label="Sao chép số tài khoản"
                  className="size-9 shrink-0 rounded-xl border-border/80 p-0 hover:bg-muted sm:size-10"
                  onClick={() => handleCopy(account.accountNumber)}
                  size="icon"
                  variant="outline"
                >
                  {isCopied(account.accountNumber) ? (
                    <CheckCircle
                      className="size-4.5 text-[#84cc16] sm:size-5"
                      weight="fill"
                    />
                  ) : (
                    <Copy className="size-4.5 text-muted-foreground sm:size-5" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const renderServiceTextWithLinks = (text: string) => {
  const urlRegex = /(?<url>https?:\/\/[^\s)]+)/gu;
  const parts = text.split(urlRegex);

  return parts.map((part) => {
    if (/^https?:\/\//u.test(part)) {
      return (
        <a
          className="font-medium text-[#84cc16] underline decoration-[#84cc16]/40 underline-offset-2 transition-colors hover:text-[#65a30d] hover:decoration-[#84cc16]"
          href={part}
          key={part}
          rel="noopener noreferrer"
          target="_blank"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const renderServiceLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const isBullet = /^[•\-*]\s*/u.test(trimmed);
  const cleanContent = trimmed.replace(/^[•\-*]\s*/u, "");

  if (
    !isBullet &&
    (cleanContent.startsWith("Chủ TK") || cleanContent.endsWith(":"))
  ) {
    return (
      <h3
        className="pt-2 font-bold text-base text-foreground"
        key={cleanContent}
      >
        {cleanContent}
      </h3>
    );
  }

  const colonIndex = cleanContent.indexOf(":");
  if (colonIndex > 0 && colonIndex < 35) {
    const label = cleanContent.slice(0, colonIndex + 1);
    const rest = cleanContent.slice(colonIndex + 1);
    return (
      <li className="flex items-start gap-2.5" key={cleanContent}>
        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#84cc16]" />
        <span className="text-sm leading-relaxed">
          <span className="font-semibold text-foreground">{label}</span>
          <span className="text-muted-foreground">
            {renderServiceTextWithLinks(rest)}
          </span>
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2.5" key={cleanContent}>
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#84cc16]" />
      <span className="text-sm leading-relaxed text-muted-foreground">
        {renderServiceTextWithLinks(cleanContent)}
      </span>
    </li>
  );
};

const VerificationWatermarkStamp = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute right-3 bottom-3 select-none opacity-25 transition-opacity duration-300 sm:right-6 sm:bottom-4 dark:opacity-30"
  >
    <div className="flex rotate-[-6deg] items-center gap-2.5 rounded-2xl border-2 border-rose-500/80 border-dashed bg-rose-500/5 px-3.5 py-2 text-rose-500 shadow-xs sm:px-4 sm:py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10">
        <ShieldCheck className="size-5 text-rose-500" weight="fill" />
      </div>
      <div className="text-left leading-tight">
        <p className="font-extrabold uppercase tracking-wider text-[0.55rem] sm:text-[0.6rem]">
          Hồ sơ xác minh uy tín
        </p>
        <p className="font-black uppercase tracking-widest text-[0.8rem] sm:text-[0.95rem]">
          AVIN05.COM
        </p>
      </div>
    </div>
  </div>
);

const ProviderServicesCard = ({ services }: { services?: string }) => {
  if (!services?.trim()) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
        <h2 className="font-bold text-base text-foreground sm:text-lg">
          Dịch vụ cung cấp
        </h2>
        <p className="mt-3 text-muted-foreground text-sm">
          Chưa có mô tả dịch vụ chi tiết.
        </p>
        <VerificationWatermarkStamp />
      </div>
    );
  }

  const lines = services.split("\n").filter((l) => Boolean(l.trim()));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
      <h2 className="font-bold text-base text-foreground sm:text-lg">
        Dịch vụ cung cấp
      </h2>
      <ul className="mt-4 space-y-3.5 pb-6 sm:pb-4">
        {lines.map((line) => renderServiceLine(line))}
      </ul>
      <VerificationWatermarkStamp />
    </div>
  );
};

const ProviderSafetySidebar = () => (
  <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
    <h2 className="font-bold text-base text-foreground sm:text-lg">
      Giao dịch an toàn
    </h2>

    <ol className="mt-4 space-y-3.5 text-sm text-foreground">
      <li className="flex items-start gap-2.5">
        <span className="font-bold text-[#84cc16]">1.</span>
        <span>Kiểm tra tên chủ tài khoản</span>
      </li>
      <li className="flex items-start gap-2.5">
        <span className="font-bold text-[#84cc16]">2.</span>
        <span>Chỉ chuyển vào tài khoản hiển thị</span>
      </li>
      <li className="flex items-start gap-2.5">
        <span className="font-bold text-[#84cc16]">3.</span>
        <span>Lưu lại thông tin giao dịch</span>
      </li>
    </ol>

    {/* Amber Alert Box */}
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-amber-500">
      <ShieldWarning className="size-5 shrink-0" weight="regular" />
      <p className="text-xs leading-relaxed">
        Chỉ chuyển tiền vào tài khoản hiển thị trên hồ sơ này.
      </p>
    </div>

    {/* Report profile link */}
    <div className="mt-6 border-t border-border/60 pt-4">
      <Link
        className="inline-flex items-center gap-2 font-medium text-[#84cc16] text-sm hover:underline"
        to="/avin-check/report"
      >
        <Flag className="size-4" />
        <span>Báo cáo hồ sơ này</span>
      </Link>
    </div>
  </div>
);

const VietQrModal = ({
  account,
  handleCopy,
  isCopied,
  onClose,
  open,
}: {
  account: ProviderDetailData["registeredBankAccounts"][number];
  handleCopy: (text: string) => void;
  isCopied: boolean;
  onClose: () => void;
  open: boolean;
}) => (
  <Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
    <DialogContent className="max-w-sm rounded-3xl p-6 text-center sm:max-w-sm">
      <DialogHeader className="text-center sm:text-center">
        <DialogTitle className="text-center font-bold text-lg text-foreground">
          Mã VietQR Chuyển Khoản
        </DialogTitle>
        <DialogDescription className="text-center font-medium text-xs text-muted-foreground">
          {account.bankCode} • {account.accountNumber}
        </DialogDescription>
      </DialogHeader>

      <div className="mx-auto flex w-full max-w-70 items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-white p-2.5 shadow-xs">
        <img
          alt="VietQR Code"
          className="aspect-square w-full rounded-xl object-contain"
          src={`https://api.vietqr.io/image/${account.bankCode}-${account.accountNumber}-compact2.jpg?accountName=${encodeURIComponent(account.accountName)}`}
        />
      </div>

      <p className="font-bold text-xs uppercase tracking-wider text-foreground">
        Chủ tài khoản: {account.accountName}
      </p>

      <Button
        className="w-full gap-1.5 rounded-xl text-xs"
        onClick={() => handleCopy(account.accountNumber)}
        size="sm"
        variant="outline"
      >
        {isCopied ? (
          <>
            <CheckCircle className="size-3.5 text-[#84cc16]" weight="fill" />
            <span>Đã sao chép</span>
          </>
        ) : (
          <>
            <Copy className="size-3.5 text-muted-foreground" />
            <span>Sao chép STK</span>
          </>
        )}
      </Button>
    </DialogContent>
  </Dialog>
);

export const ProviderPublicProfileSkeleton = ({ slug }: { slug?: string }) => (
  <div
    aria-busy="true"
    className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 text-foreground"
  >
    {/* Top Back Navigation */}
    <div className="flex items-center justify-between">
      <Link
        className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        to="/avin-check/directory"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Quay lại
      </Link>
      <span className="font-mono text-muted-foreground text-xs">
        {slug ? (
          `Mã đối tác: ${slug}`
        ) : (
          <Skeleton className="h-3.5 w-28 rounded-md" />
        )}
      </span>
    </div>

    {/* Hero Card Skeleton */}
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
        {/* Left: Avatar & Info */}
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="shrink-0">
            <div className="relative flex size-36 items-center justify-center sm:size-40">
              <div className="absolute inset-0 rounded-full border-2 border-border/40" />
              <Skeleton className="size-[86%] rounded-full" />
            </div>
          </div>

          <div className="space-y-2.5">
            <Skeleton className="h-8 w-60 rounded-lg sm:h-9 sm:w-72" />
            <Skeleton className="h-4 w-44 rounded-md sm:w-56" />
            <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5 sm:justify-start">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="h-4 w-52 rounded-md" />
            <Skeleton className="h-3.5 w-40 rounded-md" />
          </div>
        </div>

        {/* Right: Action Button Skeleton */}
        <div className="flex w-full sm:w-auto">
          <Skeleton className="h-11 w-full rounded-2xl sm:w-32" />
        </div>
      </div>

      {/* 4-Column Metric Stat Bar Skeleton */}
      <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border/80 pt-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="flex items-center gap-3" key={index}>
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Main Grid 2-Column Section */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column (8 cols) */}
      <div className="space-y-6 lg:col-span-8">
        {/* Kênh liên hệ Card */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48 rounded-md" />
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="flex items-center justify-between py-3"
                key={index}
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-4 rounded-full" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Tài khoản nhận tiền Card */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-52 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="relative grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-4 pl-6 sm:grid-cols-[9.5rem_1fr_auto] sm:gap-4 sm:p-5 sm:pl-7 md:grid-cols-[10.5rem_1fr_auto]">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <Skeleton className="h-5 w-14 rounded-md sm:w-18" />
              </div>
              <div className="min-w-0 space-y-1 text-left">
                <Skeleton className="h-5 w-44 rounded-md sm:h-6 sm:w-56" />
                <Skeleton className="h-3.5 w-28 rounded-md sm:w-36" />
              </div>
              <Skeleton className="ml-auto size-10 shrink-0 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Dịch vụ cung cấp Card */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
          <Skeleton className="h-6 w-40 rounded-md" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="flex items-center gap-2.5" key={index}>
                <Skeleton className="size-1.5 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-full max-w-md rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column (4 cols): Safety Guide Card */}
      <div className="space-y-6 lg:col-span-4">
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
          <Skeleton className="h-6 w-36 rounded-md" />
          <div className="mt-4 space-y-3.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="flex items-center gap-2.5" key={index}>
                <Skeleton className="h-4 w-4 rounded-md" />
                <Skeleton className="h-4 w-44 rounded-md" />
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="mt-6 border-t border-border/60 pt-4">
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const buildFromApiData = (
  apiData: PublicProfileApiData
): ProviderDetailData => ({
  bio: apiData.bio ?? undefined,
  displayName: apiData.displayName,
  history: (apiData.history ?? []).map((h) => ({
    publishedAt: h.publishedAt,
    recognizedBondAmount: h.recognizedBondAmount,
    tier: h.tier as ProviderDetailData["tier"],
    versionNumber: h.versionNumber,
  })),
  id: apiData.profileSlug,
  location: apiData.location ?? "Hà Nội",
  officialChannels: apiData.officialChannels ?? {},
  profileSlug: apiData.profileSlug,
  publicUrl: `/avin-check/provider/${apiData.profileSlug}`,
  publishedAt: apiData.publishedAt ?? new Date().toISOString(),
  recognizedBondAmount: apiData.recognizedBondAmount ?? 50_000_000,
  recommendedTransactionLimit:
    apiData.recommendedTransactionLimit ?? 20_000_000,
  registeredBankAccounts: (apiData.registeredBankAccounts ?? []).map((acc) => ({
    accountName: acc.accountName,
    accountNumber: acc.accountNumber,
    bankCode: acc.bankCode,
    isPrimary: acc.isPrimary,
  })),
  relatedWarnings: (apiData.relatedWarnings ?? []).map((w) => ({
    publicPath: w.publicPath,
    publicSlug: w.publicSlug,
    publishedAt: w.publishedAt ?? new Date().toISOString(),
    status: w.status,
    type: w.type,
  })),
  services: apiData.services ?? "",
  source: apiData.source ?? undefined,
  status: apiData.status,
  tier: apiData.tier as ProviderDetailData["tier"],
  verifiedAt: apiData.verifiedAt ?? new Date().toISOString(),
});

export const ProviderPublicProfilePage = () => {
  const { slug } = useParams({ from: "/(public)/avin-check/provider/$slug" });
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [qrModalAccount, setQrModalAccount] = useState<
    ProviderDetailData["registeredBankAccounts"][number] | null
  >(null);

  const profileQuery = useQuery(
    orpc.protection.publicProfile.queryOptions({ input: { slug } })
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(text);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  if (profileQuery.isPending) {
    return <ProviderPublicProfileSkeleton slug={slug} />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 text-foreground">
        <div className="flex items-center justify-between">
          <Link
            className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
            to="/avin-check/directory"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lại
          </Link>
        </div>

        <Empty className="rounded-3xl border border-border/80 bg-card p-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldWarning className="size-10 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Không tìm thấy hồ sơ đối tác</EmptyTitle>
            <EmptyDescription>
              Hồ sơ này không tồn tại hoặc đã ngừng hoạt động trên hệ thống Avin
              Check.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/avin-check/directory"
            >
              Xem danh sách đối tác
            </Link>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const provider = buildFromApiData(profileQuery.data);

  const primaryAccount =
    provider.registeredBankAccounts.find((a) => a.isPrimary) ??
    provider.registeredBankAccounts[0];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 text-foreground">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
          to="/avin-check/directory"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại
        </Link>
        <span className="font-mono text-muted-foreground text-xs">
          Mã đối tác: {provider.profileSlug}
        </span>
      </div>

      <ProviderHeroCard
        onShare={handleShare}
        provider={provider}
        shareCopied={shareCopied}
      />

      {/* Main Grid 2-Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): 1. Kênh liên hệ, 2. Tài khoản nhận tiền, 3. Dịch vụ cung cấp */}
        <div className="space-y-6 lg:col-span-8">
          <ProviderOfficialChannelsCard channels={provider.officialChannels} />

          <ProviderBankCard
            accounts={provider.registeredBankAccounts}
            handleCopy={handleCopy}
            isCopied={(num) => copiedAccount === num}
            onOpenQr={(acc) => setQrModalAccount(acc)}
            primaryAccount={primaryAccount}
          />

          <ProviderServicesCard services={provider.services} />
        </div>

        {/* Right Column (4 cols): Safety Guide Card */}
        <div className="space-y-6 lg:col-span-4">
          <ProviderSafetySidebar />
        </div>
      </div>

      {/* VietQR Modal */}
      {qrModalAccount && (
        <VietQrModal
          account={qrModalAccount}
          handleCopy={handleCopy}
          isCopied={copiedAccount === qrModalAccount.accountNumber}
          onClose={() => setQrModalAccount(null)}
          open={Boolean(qrModalAccount)}
        />
      )}
    </div>
  );
};
