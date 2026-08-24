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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@avin/ui/components/input-group";
import { Spinner } from "@avin/ui/components/spinner";
import {
  ArrowRightIcon,
  BuildingsIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

const providerDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
});
const providerMoneyFormatter = new Intl.NumberFormat("vi-VN");

const formatDate = (value: string): string =>
  providerDateFormatter.format(new Date(value));

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
    displayName: string;
    location: string;
    officialChannels: {
      facebookUrl?: string;
      hotline?: string;
      telegramCommunityUrl?: string;
      tiktokUrl?: string;
      websiteUrl?: string;
      youtubeUrl?: string;
      zalo?: string;
    };
    profileSlug: string;
    publicUrl: string;
    publishedAt: string;
    recommendedTransactionLimit: number;
    recognizedBondAmount: number;
    services: string;
    tier: string;
    verifiedAt: string;
  };
}) => (
  <Card className="h-full">
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{provider.displayName}</CardTitle>
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
          Bond {providerMoneyFormatter.format(provider.recognizedBondAmount)} ₫
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

  return (
    <Shell as="div" className="gap-6" variant="default">
      <section
        aria-labelledby="provider-directory-heading"
        className="rounded-3xl border border-primary/20 bg-linear-to-r from-primary/8 via-card to-card px-5 py-5 shadow-sm sm:px-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Badge className="mb-2 gap-1.5" variant="outline">
              <ShieldCheckIcon aria-hidden="true" /> Đối tác Avin
            </Badge>
            <h1
              className="font-bold text-2xl tracking-tight sm:text-3xl"
              id="provider-directory-heading"
            >
              Tìm đối tác đã xác minh
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Tìm theo tên, dịch vụ, địa điểm, số tài khoản, hotline hoặc kênh
              mạng xã hội.
            </p>
          </div>
          <Link
            className={buttonVariants({ size: "sm", variant: "outline" })}
            to="/avin-check/apply"
          >
            Đăng ký đối tác
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>

        <form
          className="mt-4 flex max-w-3xl flex-col gap-2 sm:flex-row"
          onSubmit={handleSearch}
        >
          <label className="sr-only" htmlFor="provider-directory-search">
            Tên, STK hoặc kênh liên hệ
          </label>
          <InputGroup className="h-10 flex-1 bg-background/80">
            <InputGroupInput
              autoComplete="off"
              id="provider-directory-search"
              maxLength={200}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nhập tên, STK, hotline, Zalo..."
              value={query}
            />
            <InputGroupAddon>
              <MagnifyingGlassIcon aria-hidden="true" />
            </InputGroupAddon>
          </InputGroup>
          <Button
            className="h-10 sm:px-5"
            disabled={searchMutation.isPending || !query.trim()}
            type="submit"
          >
            {searchMutation.isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                Đang tìm...
              </>
            ) : (
              "Tìm đối tác"
            )}
          </Button>
        </form>
      </section>

      {searchMutation.isError ? (
        <Alert role="alert">
          <AlertTitle>Chưa thể tìm đối tác</AlertTitle>
          <AlertDescription>
            Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="provider-directory-results-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2
            className="font-bold text-2xl tracking-tight sm:text-3xl"
            id="provider-directory-results-heading"
          >
            {isSearchActive ? "Kết quả tìm kiếm" : "Đối tác đã xác minh"}
          </h2>
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {directoryQuery.isPending || searchMutation.isPending
              ? "Đang tải..."
              : `${providers.length} đối tác`}
          </p>
        </div>

        {directoryQuery.isError && !isSearchActive ? (
          <Alert className="mt-6" role="alert">
            <AlertTitle>Chưa thể tải danh sách đối tác</AlertTitle>
            <AlertDescription>Vui lòng thử lại sau ít phút.</AlertDescription>
          </Alert>
        ) : null}

        {!directoryQuery.isPending &&
        !searchMutation.isPending &&
        providers.length === 0 ? (
          <Empty className="mt-6 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {isSearchActive ? (
                  <MagnifyingGlassIcon aria-hidden="true" />
                ) : (
                  <BuildingsIcon aria-hidden="true" />
                )}
              </EmptyMedia>
              <EmptyTitle>
                {isSearchActive
                  ? "Chưa tìm thấy đối tác"
                  : "Chưa có đối tác công khai"}
              </EmptyTitle>
              <EmptyDescription>
                {isSearchActive
                  ? "Hãy kiểm tra lại tên hoặc thử với một phần tên ngắn hơn."
                  : "Bạn có thể đăng ký để trở thành đối tác đầu tiên xuất hiện tại đây."}
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
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <ProviderDirectoryCard key={provider.id} provider={provider} />
          ))}
        </div>
      </section>
    </Shell>
  );
};
