import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import { MagnifyingGlassIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

const providerDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
});

const formatDate = (value: string): string =>
  providerDateFormatter.format(new Date(value));

const ProviderDirectoryCard = ({
  provider,
}: {
  provider: {
    displayName: string;
    officialChannels: {
      facebookUrl?: string;
      websiteUrl?: string;
      zalo?: string;
    };
    profileSlug: string;
    publicUrl: string;
    publishedAt: string;
    services: string;
    verifiedAt: string;
  };
}) => (
  <Card className="h-full">
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{provider.displayName}</CardTitle>
          <CardDescription className="mt-1">
            Đã xác minh {formatDate(provider.verifiedAt)}
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
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a
          className="font-medium text-primary underline underline-offset-4"
          href={provider.publicUrl}
        >
          Xem profile ổn định
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
      </div>
      <p className="text-muted-foreground text-xs">
        Cập nhật profile: {formatDate(provider.publishedAt)} ·{" "}
        {provider.profileSlug}
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
    <Shell as="div" className="gap-8" variant="default">
      <section
        aria-labelledby="provider-directory-heading"
        className="rounded-[2rem] border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card px-6 py-10 shadow-sm sm:px-10"
      >
        <Badge className="mb-4 gap-1.5" variant="outline">
          <ShieldCheckIcon aria-hidden="true" />
          Avin Check · Directory
        </Badge>
        <h1
          className="font-black text-4xl tracking-tight sm:text-5xl"
          id="provider-directory-heading"
        >
          Tìm Đối tác Avin đã được xem xét.
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
          Duyệt các profile đang hoạt động hoặc tìm chính xác theo tên,
          Facebook, Zalo/số điện thoại, tài khoản thanh toán hay nội dung dịch
          vụ đã được Reviewer phê duyệt.
        </p>
        <form
          className="mt-7 flex flex-col gap-3 sm:flex-row"
          onSubmit={handleSearch}
        >
          <label className="sr-only" htmlFor="provider-directory-search">
            Tìm Provider
          </label>
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoComplete="off"
              className="h-11 pl-9"
              id="provider-directory-search"
              maxLength={200}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tên, Facebook URL/ID, Zalo, số tài khoản hoặc dịch vụ"
              spellCheck="false"
              value={query}
            />
          </div>
          <Button
            className="h-11 sm:px-6"
            disabled={searchMutation.isPending || !query.trim()}
            type="submit"
          >
            {searchMutation.isPending ? "Đang tìm..." : "Tìm chính xác"}
          </Button>
        </form>
        <p className="mt-3 text-muted-foreground text-xs">
          Tra cứu tài khoản thanh toán chỉ đối chiếu chính xác; hệ thống không
          fuzzy-match hoặc lưu giá trị tìm kiếm vào URL/autocomplete.
        </p>
      </section>

      {searchMutation.isError ? (
        <Alert className="border-amber-500/30 bg-amber-500/5" role="alert">
          <AlertTitle>Không thể hoàn tất tra cứu</AlertTitle>
          <AlertDescription>
            Vui lòng thử lại sau. Vì lý do riêng tư, giá trị tìm kiếm không được
            ghi vào thông báo lỗi.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="provider-directory-results-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-medium text-primary text-sm">
              Provider đang hoạt động
            </p>
            <h2
              className="font-bold text-3xl tracking-tight"
              id="provider-directory-results-heading"
            >
              {isSearchActive ? "Kết quả tra cứu" : "Directory công khai"}
            </h2>
          </div>
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {directoryQuery.isPending || searchMutation.isPending
              ? "Đang tải..."
              : `${providers.length} profile`}
          </p>
        </div>

        {directoryQuery.isError && !isSearchActive ? (
          <p className="mt-6 rounded-2xl border border-destructive/30 p-5 text-sm">
            Không thể tải Directory lúc này. Vui lòng thử lại sau.
          </p>
        ) : null}

        {!directoryQuery.isPending &&
        !searchMutation.isPending &&
        providers.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-border/60 p-5 text-muted-foreground text-sm">
            Không tìm thấy profile phù hợp.
          </p>
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
