import { Badge } from "@avin/ui/components/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@avin/ui/components/item";
import { Skeleton } from "@avin/ui/components/skeleton";
import { ArrowRightIcon, ShieldWarningIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export interface RiskWarningListItemProps {
  date: string;
  metadata?: ReactNode;
  provenance?: ReactNode;
  publicSlug: string;
  statusLabel?: string;
  summary?: string | null;
  title: string;
}

export const RiskWarningListItem = ({
  date,
  metadata,
  provenance,
  publicSlug,
  statusLabel,
  summary,
  title,
}: RiskWarningListItemProps) => (
  <Item className="rounded-none border-0 border-b border-border/70 px-0 py-4 last:border-b-0 sm:px-1">
    <ItemMedia className="bg-primary/10 text-primary" variant="icon">
      <ShieldWarningIcon aria-hidden="true" />
    </ItemMedia>
    <ItemContent className="gap-1">
      <ItemTitle className="font-semibold">{title}</ItemTitle>
      {summary ? (
        <ItemDescription className="max-w-2xl text-sm leading-6">
          {summary}
        </ItemDescription>
      ) : null}
      {provenance ? (
        <div className="mt-1 text-muted-foreground text-sm">{provenance}</div>
      ) : null}
      {metadata ? <div className="mt-2">{metadata}</div> : null}
    </ItemContent>
    <ItemActions className="ml-auto flex-col items-end gap-2 sm:min-w-28">
      {statusLabel ? <Badge variant="outline">{statusLabel}</Badge> : null}
      <span className="text-muted-foreground text-xs">{date}</span>
      <Link
        className="inline-flex items-center gap-1 font-medium text-primary text-sm underline underline-offset-4"
        params={{ slug: publicSlug }}
        to="/avin-check/warning/$slug"
      >
        Xem chi tiết
        <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </ItemActions>
  </Item>
);

export const RiskWarningListItemSkeleton = () => (
  <Item className="rounded-none border-0 border-b border-border/70 px-0 py-4 last:border-b-0 sm:px-1">
    <ItemMedia className="bg-primary/10 text-primary" variant="icon">
      <Skeleton className="size-4 rounded-xs" />
    </ItemMedia>
    <ItemContent className="gap-1">
      <ItemTitle>
        <Skeleton className="h-5 w-28 rounded-md" />
      </ItemTitle>
      <div className="max-w-2xl space-y-1.5 pt-0.5">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
    </ItemContent>
    <ItemActions className="ml-auto flex-col items-end gap-2 sm:min-w-28">
      <Skeleton className="h-3.5 w-20 rounded-md" />
      <Skeleton className="h-4 w-24 rounded-md" />
    </ItemActions>
  </Item>
);
