import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button, buttonVariants } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avin/ui/components/empty";
import { Input } from "@avin/ui/components/input";
import { Skeleton } from "@avin/ui/components/skeleton";
import { Spinner } from "@avin/ui/components/spinner";
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

import { ProviderShowcaseSection } from "../components/provider-showcase-section";
import type { MockProvider } from "../data/mock-providers";

const providerDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
});
const providerMoneyFormatter = new Intl.NumberFormat("vi-VN");

const formatDate = (value: string): string =>
  providerDateFormatter.format(new Date(value));

const mapApiToMockProvider = (
  p: {
    bio?: string | null;
    displayName: string;
    id: string;
    location?: string | null;
    officialChannels?: {
      additionalZalos?: string[];
      avatarUrl?: string;
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
    } | null;
    profileSlug: string;
    publicUrl: string;
    publishedAt?: string | null;
    recommendedTransactionLimit?: number | null;
    recognizedBondAmount?: number | null;
    services?: string | null;
    source?: string | null;
    tier?: string | null;
    verifiedAt?: string | null;
  },
  _index: number
): MockProvider => ({
  avatarUrl: p.officialChannels?.avatarUrl ?? "",
  bio: p.bio ?? undefined,
  displayName: p.displayName,
  id: p.id,
  isVerified: true,
  location: p.location ?? "",
  officialChannels: p.officialChannels ?? {},
  rank: undefined,
  recognizedBondAmount: p.recognizedBondAmount ?? 50_000_000,
  recommendedTransactionLimit: p.recommendedTransactionLimit ?? 20_000_000,
  services: p.services ?? "",
  slug: p.profileSlug,
  source: p.source ?? undefined,
  tier: (p.tier as MockProvider["tier"]) ?? "BRONZE",
  verifiedAt: p.verifiedAt ?? "",
});

const TIER_LABELS = {
  BRONZE: "Đồng",
  DIAMOND: "Kim cương",
  GOLD: "Vàng",
  NORMAL: "Normal",
  SILVER: "Bạc",
  VIP: "VIP",
} as const;

const ProviderDirectoryCard = ({
  provider,
}: {
  provider: {
    bio?: string | null;
    displayName: string;
    location: string;
    officialChannels: {
      additionalZalos?: string[];
      avatarUrl?: string;
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
    recommendedTransactionLimit: number;
    recognizedBondAmount: number;
    services: string;
    source?: string | null;
    tier: string;
    verifiedAt: string;
  };
}) => (
  <Card className="h-full">
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{provider.displayName}</CardTitle>
            {provider.source === "CHECKSCAM" ? (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-semibold text-[0.65rem] text-amber-600 dark:text-amber-400">
                Nguồn: CheckScam
              </span>
            ) : null}
          </div>
          {provider.bio ? (
            <p className="mt-1 font-medium text-muted-foreground text-xs italic">
              {provider.bio}
            </p>
          ) : null}
          <CardDescription className="mt-1">
            {provider.location || "Địa điểm chưa cập nhật"} · Đã xác minh{" "}
            {formatDate(provider.verifiedAt)}
          </CardDescription>
        </div>
        <Badge className="shrink-0" variant="outline">
          Đang hoạt động
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="flex h-full flex-col gap-4">
      <p className="whitespace-pre-wrap text-sm leading-6">
        {provider.services}
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        {provider.tier === "NORMAL" ? (
          <span className="py-1 text-muted-foreground">Normal</span>
        ) : (
          <Badge variant="secondary">
            Hạng{" "}
            {TIER_LABELS[provider.tier as keyof typeof TIER_LABELS] ??
              provider.tier}
          </Badge>
        )}
        <Badge variant="secondary">
          Quỹ đảm bảo{" "}
          {providerMoneyFormatter.format(provider.recognizedBondAmount)} ₫
        </Badge>
        <Badge variant="secondary">
          Khuyến nghị ≤{" "}
          {providerMoneyFormatter.format(provider.recommendedTransactionLimit)}{" "}
          ₫
        </Badge>
      </div>
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a
          className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
          href={provider.publicUrl}
        >
          Xem hồ sơ
          <ArrowRightIcon aria-hidden="true" />
        </a>
        {provider.officialChannels.facebookUrl ? (
          <a
            className="text-muted-foreground underline underline-offset-4"
            href={provider.officialChannels.facebookUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Facebook
          </a>
        ) : null}
        {provider.officialChannels.websiteUrl ? (
          <a
            className="text-muted-foreground underline underline-offset-4"
            href={provider.officialChannels.websiteUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Website
          </a>
        ) : null}
        {provider.officialChannels.tiktokUrl ? (
          <a
            className="text-muted-foreground underline underline-offset-4"
            href={provider.officialChannels.tiktokUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            TikTok
          </a>
        ) : null}
        {provider.officialChannels.youtubeUrl ? (
          <a
            className="text-muted-foreground underline underline-offset-4"
            href={provider.officialChannels.youtubeUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            YouTube
          </a>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">
        Hồ sơ được cập nhật ngày {formatDate(provider.publishedAt)}
      </p>
    </CardContent>
  </Card>
);

export const ProviderDirectoryPage = () => {
  const [query, setQuery] = useState("");
  const directoryQuery = useQuery(
    orpc.protection.providerDirectory.list.queryOptions({
      input: { limit: 24 },
    })
  );
  const searchMutation = useMutation(
    orpc.protection.providerDirectory.search.mutationOptions()
  );

  const isSearchActive = searchMutation.data !== undefined;
  const providers = isSearchActive
    ? searchMutation.data.providers
    : (directoryQuery.data?.providers ?? []);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }
    await searchMutation.mutateAsync({ query: trimmedQuery });
  };

  const initialProviders =
    directoryQuery.data?.providers?.map(mapApiToMockProvider) ?? [];

  const renderSearchResults = () => {
    if (searchMutation.isPending) {
      return (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card className="h-full" key={index}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Skeleton className="h-12 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-28 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (providers.length === 0) {
      return (
        <Empty className="mt-6 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MagnifyingGlassIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Chưa tìm thấy đối tác</EmptyTitle>
            <EmptyDescription>
              Hãy kiểm tra lại tên hoặc thử với một phần tên ngắn hơn.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/avin-check/apply"
            >
              Đăng ký đối tác
              <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
            </Link>
          </EmptyContent>
        </Empty>
      );
    }

    return (
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {providers.map((provider) => (
          <ProviderDirectoryCard key={provider.id} provider={provider} />
        ))}
      </div>
    );
  };

  return (
    <Shell as="div" className="gap-8" variant="default">
      <section
        aria-labelledby="provider-directory-heading"
        className="grid gap-6 border-b pb-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <Badge className="w-fit gap-1.5" variant="outline">
              <ShieldCheckIcon aria-hidden="true" />
              Avin Đối tác
            </Badge>
            <h1
              className="font-black text-4xl tracking-tight sm:text-5xl"
              id="provider-directory-heading"
            >
              Tìm đối tác đã xác minh
            </h1>
          </div>
          <Link
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-4xl border border-input px-3 font-medium text-sm transition hover:bg-accent hover:text-accent-foreground"
            to="/avin-check/apply"
          >
            Đăng ký đối tác
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>

        <form className="grid gap-3" onSubmit={handleSearch}>
          <label
            className="font-medium text-sm"
            htmlFor="provider-directory-search"
          >
            Nhập tên đối tác, dịch vụ hoặc thông tin liên hệ
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              autoComplete="off"
              className="h-12 flex-1"
              id="provider-directory-search"
              maxLength={200}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ví dụ: Tên đối tác, số điện thoại hoặc website"
              spellCheck="false"
              value={query}
            />
            <Button
              className="h-12 sm:px-6"
              disabled={searchMutation.isPending || !query.trim()}
              type="submit"
            >
              {searchMutation.isPending ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Đang tìm...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon data-icon="inline-start" />
                  Tìm đối tác
                </>
              )}
            </Button>
          </div>
        </form>
        <p className="text-muted-foreground text-sm">
          Tra cứu đối tác đã xác minh theo tên, dịch vụ, địa điểm, số tài khoản,
          số điện thoại hoặc kênh mạng xã hội.
        </p>
      </section>

      {searchMutation.isError ? (
        <Alert role="alert">
          <AlertTitle>Chưa thể tìm đối tác</AlertTitle>
          <AlertDescription>
            Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.
          </AlertDescription>
        </Alert>
      ) : null}

      {isSearchActive ? (
        <section aria-labelledby="provider-directory-results-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2
              className="font-bold text-2xl tracking-tight sm:text-3xl"
              id="provider-directory-results-heading"
            >
              Kết quả tìm kiếm
            </h2>
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {searchMutation.isPending
                ? "Đang tải..."
                : `${providers.length} đối tác`}
            </p>
          </div>

          {renderSearchResults()}
        </section>
      ) : (
        <ProviderShowcaseSection
          initialProviders={initialProviders}
          isLoading={directoryQuery.isPending}
        />
      )}
    </Shell>
  );
};
