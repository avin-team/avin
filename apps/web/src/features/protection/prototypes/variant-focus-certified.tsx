import { Button } from "@avin/ui/components/button";
import {
  ArrowRight,
  CaretRight,
  CheckCircle,
  ClockCounterClockwise,
  Copy,
  CurrencyCircleDollar,
  Diamond,
  Export,
  FacebookLogo,
  Flag,
  LockKey,
  Phone,
  ShieldCheck,
  ShieldWarning,
  TelegramLogo,
  User,
} from "@phosphor-icons/react";
import { useState } from "react";

import { ProviderTierFrame } from "../components/provider-tier-frame";
import type { ProviderDetailData } from "./mock-detail-data";

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

export const VariantFocusCertified = ({
  provider,
}: {
  provider: ProviderDetailData;
}) => {
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(text);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const primaryAccount =
    provider.registeredBankAccounts.find((a) => a.isPrimary) ??
    provider.registeredBankAccounts[0];

  const formattedMonthYear = () => {
    if (!provider.verifiedAt) {
      return "05.2024";
    }
    const d = new Date(provider.verifiedAt);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const y = d.getFullYear();
    return `${m}.${y}`;
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 text-foreground">
      {/* Top Hero Profile Card */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
          {/* Left: Avatar with Tier Frame and Information */}
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="shrink-0">
              <ProviderTierFrame
                className="size-36 sm:size-40"
                isVerified
                recognizedBondAmount={provider.recognizedBondAmount}
                recommendedTransactionLimit={
                  provider.recommendedTransactionLimit
                }
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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-extrabold text-3xl tracking-tight text-foreground sm:text-4xl">
                  {provider.displayName}
                </h1>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-bold text-xs text-emerald-500 border border-emerald-500/30">
                  Proof of Reserve ✓
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 font-semibold text-emerald-500 text-sm">
                <CheckCircle className="size-4" weight="fill" />
                <span>Danh tính đã xác minh • Cam kết bảo đảm</span>
              </div>

              <p className="text-muted-foreground text-sm">
                Giao dịch viên • Crypto & Coin & OTC
              </p>

              <p className="text-muted-foreground text-xs">
                {provider.location} • Hoạt động từ {formattedMonthYear()}
              </p>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-48">
            <a
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#84cc16] px-5 font-bold text-black text-sm shadow-xs transition-all hover:bg-[#65a30d]"
              href={
                provider.officialChannels.zalo
                  ? `https://zalo.me/${provider.officialChannels.zalo.replaceAll(/\s+/gu, "")}`
                  : `tel:${provider.officialChannels.hotline?.replaceAll(/\s+/gu, "") ?? ""}`
              }
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>Liên hệ giao dịch viên</span>
              <ArrowRight className="size-4" />
            </a>

            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border/80 bg-background/50 px-5 font-semibold text-foreground text-sm transition-colors hover:bg-muted"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
              }}
              type="button"
            >
              <Export className="size-4" />
              <span>Chia sẻ hồ sơ</span>
            </button>
          </div>
        </div>

        {/* 4-Column Metric Stat Bar */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border/80 pt-6 md:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-foreground">
              <ShieldCheck className="size-6" weight="regular" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Trạng thái</p>
              <p className="font-bold text-foreground text-sm sm:text-base">
                Đã xác minh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-foreground">
              <Diamond className="size-6" weight="regular" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Hạng thành viên</p>
              <p className="font-bold text-foreground text-sm sm:text-base">
                {TIER_NAMES[provider.tier] ?? provider.tier}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-foreground">
              <LockKey className="size-6 text-[#84cc16]" weight="fill" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Quỹ bảo chứng</p>
              <p className="font-bold text-[#84cc16] text-sm sm:text-base">
                {vndFormatter.format(provider.recognizedBondAmount)} đ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-foreground">
              <CurrencyCircleDollar
                className="size-6 text-[#84cc16]"
                weight="regular"
              />
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

      {/* Main Grid 2-Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): About, Bank, Contacts, History */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card: Về giao dịch viên */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
            <h2 className="font-bold text-base text-foreground sm:text-lg">
              Về giao dịch viên
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
              {provider.services ||
                "Tôi là giao dịch viên chuyên nghiệp trong lĩnh vực Crypto & Coin với kinh nghiệm thực tế, luôn đặt sự minh bạch và an toàn của khách hàng lên hàng đầu. Cam kết giao dịch nhanh chóng, chính xác và hỗ trợ tận tâm 24/7."}
            </p>
          </div>

          {/* Card: Tài khoản nhận tiền */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-foreground sm:text-lg">
                Tài khoản nhận tiền
              </h2>
              <span className="inline-flex items-center gap-1 font-semibold text-[#84cc16] text-xs">
                <CheckCircle className="size-3.5" weight="fill" />
                Tài khoản đã xác minh
              </span>
            </div>

            {primaryAccount ? (
              <div className="relative mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4 pl-5">
                {/* Green accent bar */}
                <div className="absolute top-3 bottom-3 left-0 w-1.5 rounded-r-full bg-[#84cc16]" />

                <div className="flex items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950/40 text-emerald-400 font-bold text-xs">
                    {primaryAccount.bankCode}
                  </div>
                  <div>
                    <p className="font-mono font-extrabold text-foreground text-lg tracking-wider">
                      {primaryAccount.accountNumber}
                    </p>
                    <p className="text-muted-foreground text-xs uppercase font-medium">
                      {primaryAccount.accountName}
                    </p>
                  </div>
                </div>

                <Button
                  aria-label="Sao chép số tài khoản"
                  className="size-9 rounded-xl p-0"
                  onClick={() => handleCopy(primaryAccount.accountNumber)}
                  size="icon"
                  variant="outline"
                >
                  {copiedAccount === primaryAccount.accountNumber ? (
                    <CheckCircle className="size-4 text-[#84cc16]" />
                  ) : (
                    <Copy className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            ) : null}
          </div>

          {/* Card: Kênh liên hệ */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
            <h2 className="font-bold text-base text-foreground sm:text-lg">
              Kênh liên hệ
            </h2>

            <div className="mt-4 divide-y divide-border/60">
              {provider.officialChannels.hotline ? (
                <a
                  className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
                  href={`tel:${provider.officialChannels.hotline.replaceAll(/\s+/gu, "")}`}
                >
                  <div className="flex items-center gap-3">
                    <Phone className="size-4 text-muted-foreground" />
                    <span>Phone</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-muted-foreground">
                    <span>{provider.officialChannels.hotline}</span>
                    <CaretRight className="size-4 text-muted-foreground" />
                  </div>
                </a>
              ) : null}

              {provider.officialChannels.zalo ? (
                <a
                  className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
                  href={`https://zalo.me/${provider.officialChannels.zalo.replaceAll(/\s+/gu, "")}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-4 items-center justify-center rounded-full bg-blue-500 font-bold text-[0.6rem] text-white">
                      Z
                    </span>
                    <span>Zalo</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-muted-foreground">
                    <span>{provider.officialChannels.zalo}</span>
                    <CaretRight className="size-4 text-muted-foreground" />
                  </div>
                </a>
              ) : null}

              {provider.officialChannels.telegramCommunityUrl ? (
                <a
                  className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
                  href={provider.officialChannels.telegramCommunityUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="flex items-center gap-3">
                    <TelegramLogo
                      className="size-4 text-sky-500"
                      weight="fill"
                    />
                    <span>Telegram</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>
                      {provider.officialChannels.telegramCommunityUrl.replace(
                        "https://t.me/",
                        "@"
                      )}
                    </span>
                    <CaretRight className="size-4 text-muted-foreground" />
                  </div>
                </a>
              ) : null}

              {provider.officialChannels.facebookUrl ? (
                <a
                  className="flex items-center justify-between py-3 text-sm transition-colors hover:text-primary"
                  href={provider.officialChannels.facebookUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="flex items-center gap-3">
                    <FacebookLogo
                      className="size-4 text-blue-600"
                      weight="fill"
                    />
                    <span>Facebook</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Xem Facebook</span>
                    <CaretRight className="size-4 text-muted-foreground" />
                  </div>
                </a>
              ) : null}
            </div>
          </div>

          {/* Collapsible History Section */}
          {provider.history.length > 0 && (
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base text-foreground sm:text-lg flex items-center gap-2">
                  <ClockCounterClockwise className="size-5 text-[#84cc16]" />
                  Lịch sử nâng hạng & Quỹ bảo đảm
                </h2>
                <button
                  className="text-xs font-semibold text-[#84cc16] hover:underline"
                  onClick={() => setShowHistory(!showHistory)}
                  type="button"
                >
                  {showHistory
                    ? "Thu gọn"
                    : `Xem ${provider.history.length} phiên bản`}
                </button>
              </div>

              {showHistory && (
                <div className="mt-4 space-y-2.5 pt-2 border-t border-border/60">
                  {provider.history.map((h) => (
                    <div
                      className="flex items-center justify-between rounded-xl bg-muted/20 p-3 text-xs"
                      key={h.versionNumber}
                    >
                      <div>
                        <span className="font-bold text-foreground">
                          Phiên bản v{h.versionNumber} • Hạng{" "}
                          {TIER_NAMES[h.tier] ?? h.tier}
                        </span>
                        <p className="text-muted-foreground text-[0.7rem] mt-0.5">
                          {new Date(h.publishedAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-[#84cc16]">
                        {vndFormatter.format(h.recognizedBondAmount)} đ
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Safety Guide Card */}
        <div className="space-y-6 lg:col-span-4">
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
              <button
                className="inline-flex items-center gap-2 font-medium text-[#84cc16] text-sm hover:underline"
                type="button"
              >
                <Flag className="size-4" />
                <span>Báo cáo hồ sơ này</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Community Review Bottom Section */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:flex-row sm:p-7">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted/30 text-muted-foreground">
            <User className="size-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              Đánh giá từ cộng đồng
            </h3>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Chưa có đánh giá • Hãy là người đầu tiên đánh giá giao dịch viên
              này.
            </p>
          </div>
        </div>

        <button
          className="rounded-2xl border border-border/80 bg-background/50 px-5 py-2.5 font-semibold text-foreground text-sm transition-colors hover:bg-muted"
          type="button"
        >
          Đánh giá hồ sơ
        </button>
      </div>
    </div>
  );
};
