import { Button } from "@avin/ui/components/button";
import {
  ArrowRight,
  CaretRight,
  CheckCircle,
  Copy,
  CurrencyCircleDollar,
  Diamond,
  Export,
  FacebookLogo,
  Flag,
  Phone,
  QrCode,
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

export const VariantFocusInteractive = ({
  provider,
}: {
  provider: ProviderDetailData;
}) => {
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [selectedBankIndex, setSelectedBankIndex] = useState<number>(0);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(text);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const currentAccount =
    provider.registeredBankAccounts[selectedBankIndex] ??
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
              <h1 className="font-extrabold text-3xl tracking-tight text-foreground sm:text-4xl">
                {provider.displayName}
              </h1>

              <div className="inline-flex items-center gap-1.5 font-semibold text-emerald-500 text-sm">
                <CheckCircle className="size-4" weight="fill" />
                <span>Danh tính đã xác minh eKYC</span>
              </div>

              <p className="text-muted-foreground text-sm">
                Giao dịch viên • Crypto & Coin & P2P
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
              <ShieldCheck className="size-6" weight="regular" />
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

      {/* Main Grid 2-Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): About, Multi-Bank Tabs, Contacts */}
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

          {/* Card: Tài khoản nhận tiền với Multi-bank tabs */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-base text-foreground sm:text-lg">
                Tài khoản nhận tiền ({provider.registeredBankAccounts.length})
              </h2>
              <span className="inline-flex items-center gap-1 font-semibold text-[#84cc16] text-xs">
                <CheckCircle className="size-3.5" weight="fill" />
                Tài khoản đã xác minh chính chủ
              </span>
            </div>

            {/* Bank Selector Chips if multiple */}
            {provider.registeredBankAccounts.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {provider.registeredBankAccounts.map((acc, idx) => (
                  <button
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedBankIndex === idx
                        ? "bg-[#84cc16] text-black"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                    key={`${acc.bankCode}-${acc.accountNumber}`}
                    onClick={() => setSelectedBankIndex(idx)}
                    type="button"
                  >
                    {acc.bankCode} {acc.isPrimary ? "• Chính" : ""}
                  </button>
                ))}
              </div>
            )}

            {currentAccount ? (
              <div className="relative mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4 pl-5">
                {/* Green accent bar */}
                <div className="absolute top-3 bottom-3 left-0 w-1.5 rounded-r-full bg-[#84cc16]" />

                <div className="flex items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950/40 text-emerald-400 font-bold text-xs">
                    {currentAccount.bankCode}
                  </div>
                  <div>
                    <p className="font-mono font-extrabold text-foreground text-lg tracking-wider">
                      {currentAccount.accountNumber}
                    </p>
                    <p className="text-muted-foreground text-xs uppercase font-medium">
                      {currentAccount.accountName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    aria-label="Mở mã QR"
                    className="size-9 rounded-xl p-0"
                    onClick={() => setShowQrModal(!showQrModal)}
                    size="icon"
                    variant="outline"
                  >
                    <QrCode className="size-4 text-muted-foreground" />
                  </Button>
                  <Button
                    aria-label="Sao chép số tài khoản"
                    className="size-9 rounded-xl p-0"
                    onClick={() => handleCopy(currentAccount.accountNumber)}
                    size="icon"
                    variant="outline"
                  >
                    {copiedAccount === currentAccount.accountNumber ? (
                      <CheckCircle className="size-4 text-[#84cc16]" />
                    ) : (
                      <Copy className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
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

      {/* QR Code Modal */}
      {showQrModal && currentAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 text-center shadow-xl">
            <h3 className="font-bold text-base text-foreground">
              Mã VietQR Chuyển Khoản
            </h3>
            <p className="mt-1 text-muted-foreground text-xs">
              {currentAccount.bankCode} • {currentAccount.accountNumber}
            </p>

            <div className="my-5 flex items-center justify-center rounded-2xl bg-white p-4">
              <img
                alt="VietQR Code"
                className="size-48 object-contain"
                src={`https://api.vietqr.io/image/${currentAccount.bankCode}-${currentAccount.accountNumber}-compact2.jpg?accountName=${encodeURIComponent(currentAccount.accountName)}`}
              />
            </div>

            <p className="font-bold text-foreground text-xs uppercase">
              {currentAccount.accountName}
            </p>

            <div className="mt-5 flex gap-2">
              <Button
                className="w-full rounded-xl text-xs"
                onClick={() => handleCopy(currentAccount.accountNumber)}
                size="sm"
                variant="outline"
              >
                Sao chép STK
              </Button>
              <Button
                className="w-full rounded-xl text-xs"
                onClick={() => setShowQrModal(false)}
                size="sm"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
