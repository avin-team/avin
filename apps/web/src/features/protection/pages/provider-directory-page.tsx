import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

import type { ShowcaseProvider } from "../components/provider-showcase-section";
import { ProviderShowcaseSection } from "../components/provider-showcase-section";

const mapApiToShowcaseProvider = (
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
): ShowcaseProvider => ({
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
  tier: (p.tier as ShowcaseProvider["tier"]) ?? "BRONZE",
  verifiedAt: p.verifiedAt ?? "",
});

const normalizeSearch = (value: string | null | undefined): string =>
  value
    ? value
        .normalize("NFD")
        .replaceAll(/[\u0300-\u036F]/gu, "")
        .toLocaleLowerCase("vi-VN")
        .trim()
    : "";

const handleSearch = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
};

const providerMatchesQuery = (
  provider: ShowcaseProvider,
  normalizedQuery: string,
  rawQuery: string
): boolean => {
  if (!normalizedQuery) {
    return true;
  }

  const rawMatchFields = [
    provider.displayName,
    provider.bio,
    provider.services,
    provider.location,
    provider.officialChannels.hotline,
    provider.officialChannels.zalo,
    provider.officialChannels.zaloSecondary,
    provider.officialChannels.facebookUrl,
    provider.officialChannels.facebookSecondaryUrl,
    provider.officialChannels.websiteUrl,
    provider.officialChannels.tiktokUrl,
    provider.officialChannels.youtubeUrl,
    provider.officialChannels.telegramCommunityUrl,
    ...(provider.officialChannels.additionalZalos ?? []),
    ...(provider.officialChannels.zalos?.map((item) => item.phone) ?? []),
    ...(provider.officialChannels.facebooks?.map((fb) => fb.url) ?? []),
  ];

  for (const field of rawMatchFields) {
    if (!field) {
      continue;
    }
    const lower = field.toLowerCase();
    if (lower.includes(rawQuery)) {
      return true;
    }
    const normalized = normalizeSearch(field);
    if (normalized.includes(normalizedQuery)) {
      return true;
    }
  }

  return false;
};

export const ProviderDirectoryPage = () => {
  const [query, setQuery] = useState("");

  const directoryQuery = useQuery(
    orpc.protection.providerDirectory.list.queryOptions({
      input: { limit: 50 },
    })
  );

  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeSearch(trimmedQuery);
  const rawQuery = trimmedQuery.toLowerCase();
  const isSearchActive = trimmedQuery.length > 0;

  const allProviders = useMemo(
    () => directoryQuery.data?.providers?.map(mapApiToShowcaseProvider) ?? [],
    [directoryQuery.data?.providers]
  );

  const filteredProviders = useMemo(() => {
    if (!isSearchActive) {
      return allProviders;
    }
    return allProviders.filter((provider) =>
      providerMatchesQuery(provider, normalizedQuery, rawQuery)
    );
  }, [allProviders, isSearchActive, normalizedQuery, rawQuery]);

  const handleClear = () => {
    setQuery("");
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
            <div className="relative flex-1">
              <Input
                autoComplete="off"
                className="h-12 w-full pr-10"
                id="provider-directory-search"
                maxLength={200}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ví dụ: Tên đối tác, số điện thoại hoặc website"
                spellCheck="false"
                value={query}
              />
              {query ? (
                <button
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={handleClear}
                  type="button"
                >
                  <XCircleIcon
                    aria-hidden="true"
                    className="size-5"
                    weight="fill"
                  />
                </button>
              ) : null}
            </div>
            <Button
              className="h-12 sm:px-6"
              disabled={directoryQuery.isPending || !trimmedQuery}
              type="submit"
            >
              <MagnifyingGlassIcon data-icon="inline-start" />
              Tìm đối tác
            </Button>
          </div>
        </form>
        <p className="text-muted-foreground text-sm">
          Tra cứu đối tác đã xác minh theo tên, dịch vụ, địa điểm, số tài khoản,
          số điện thoại hoặc kênh mạng xã hội.
        </p>
      </section>

      {directoryQuery.isError ? (
        <Alert role="alert">
          <AlertTitle>Chưa thể tải danh sách đối tác</AlertTitle>
          <AlertDescription>
            Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.
          </AlertDescription>
        </Alert>
      ) : null}

      <ProviderShowcaseSection
        initialProviders={filteredProviders}
        isLoading={directoryQuery.isPending}
        isSearching={isSearchActive}
        onClearSearch={handleClear}
        searchQuery={trimmedQuery}
        title={isSearchActive ? "Kết quả tìm kiếm" : "Đối tác đã xác minh"}
      />
    </Shell>
  );
};
