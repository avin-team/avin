import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { ItemGroup } from "@avin/ui/components/item";
import { Skeleton } from "@avin/ui/components/skeleton";
import { EyeIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import type { PublicRiskIdentifierLookup } from "../api/risk-lookup-api";
import type { PublicRiskWarning } from "../api/risk-warning-api";
import { usePublicRiskWarnings } from "../api/risk-warning-api";
import {
  RiskWarningListItem,
  RiskWarningListItemSkeleton,
} from "./risk-warning-list-item";

const riskWarningDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
});
const riskWarningNumberFormatter = new Intl.NumberFormat("vi-VN");

const formatDate = (value: string | null): string =>
  value ? riskWarningDateFormatter.format(new Date(value)) : "Chưa xác định";

const getPrimaryWarningIdentifier = (warning: PublicRiskWarning): string => {
  const primaryIdentifier = warning.identifiers.find(
    (identifier) => identifier.isPrimary
  );
  const identifier = primaryIdentifier ?? warning.identifiers[0];
  const reportedAsset = warning.reportedAssets?.[0];
  return (
    identifier?.publicValue ??
    identifier?.maskedValue ??
    reportedAsset?.publicValue ??
    reportedAsset?.maskedValue ??
    "Chưa xác định"
  );
};

const formatClaimedLoss = (value: number | null): string =>
  value === null
    ? "Chưa rõ số tiền người tố cáo khai"
    : `${riskWarningNumberFormatter.format(value)} ₫`;

const lookupStatusLabels = {
  CORRECTED: "Đã cập nhật",
  PUBLISHED: "Đã công khai",
} as const;

const PublicRiskWarningListItem = ({
  warning,
}: {
  warning: PublicRiskWarning;
}) => (
  <RiskWarningListItem
    date={formatDate(warning.publishedAt)}
    metadata={
      <dl className="flex flex-wrap gap-2 text-sm">
        <div className="inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-muted-foreground">
          <EyeIcon aria-hidden="true" className="size-4" />
          <dt className="sr-only">Lượt xem</dt>
          <dd className="font-semibold text-foreground">
            {riskWarningNumberFormatter.format(warning.viewCount)}
          </dd>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-destructive">
          <dt className="sr-only">Số tiền người tố cáo khai</dt>
          <dd className="font-semibold">
            {formatClaimedLoss(warning.claimedLoss)}
          </dd>
        </div>
      </dl>
    }
    publicSlug={warning.publicSlug}
    summary={warning.publicNarrative ?? warning.publicSummary}
    title={warning.publicTitle ?? getPrimaryWarningIdentifier(warning)}
  />
);

interface PublicRiskWarningCatalogueProps {
  emptyLookupContent?: ReactNode;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  lookupResult?: PublicRiskIdentifierLookup | null;
  onLoadMore?: () => void;
}

const LookupWarningListItem = ({
  identifier,
  warning,
}: {
  identifier: string;
  warning: PublicRiskIdentifierLookup["warnings"][number];
}) => (
  <RiskWarningListItem
    date={formatDate(warning.publishedAt)}
    metadata={
      <span className="text-muted-foreground text-sm">
        {warning.claimedLoss === null
          ? ""
          : formatClaimedLoss(warning.claimedLoss)}
      </span>
    }
    provenance={
      <>
        <span>Nguồn: </span>
        {warning.externalSource.url ? (
          <a
            className="font-medium text-primary underline underline-offset-4"
            href={warning.externalSource.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {warning.externalSource.title ?? warning.externalSource.name}
          </a>
        ) : (
          <span className="font-medium">{warning.externalSource.name}</span>
        )}
      </>
    }
    publicSlug={warning.publicSlug}
    statusLabel={lookupStatusLabels[warning.status]}
    summary={warning.publicNarrative ?? warning.publicSummary}
    title={warning.publicTitle ?? identifier}
  />
);

const PublicRiskWarningItems = ({
  lookupResult,
  warnings,
}: {
  lookupResult: PublicRiskIdentifierLookup | null;
  warnings: PublicRiskWarning[];
}) => {
  if (lookupResult) {
    return (
      <ItemGroup>
        {lookupResult.groups.flatMap((group) =>
          group.warnings.map((warning) => (
            <LookupWarningListItem
              identifier={
                group.identifier.publicValue ?? group.identifier.maskedValue
              }
              key={`${group.groupId}-${warning.publicSlug}`}
              warning={warning}
            />
          ))
        )}
      </ItemGroup>
    );
  }

  return (
    <ItemGroup>
      {warnings.map((warning) => (
        <PublicRiskWarningListItem key={warning.publicSlug} warning={warning} />
      ))}
    </ItemGroup>
  );
};

const getCatalogueDescription = (
  lookupResult: PublicRiskIdentifierLookup | null
): string => {
  if (!lookupResult) {
    return "Kiểm tra kỹ định danh và thông tin trước khi giao dịch.";
  }
  if (lookupResult.exactMatch) {
    return "Các tố cáo trùng khớp với định danh bạn vừa tra cứu.";
  }
  return "Chưa có tố cáo công khai trùng khớp với định danh này.";
};

const getWarningCount = (
  lookupResult: PublicRiskIdentifierLookup | null,
  warningsCount: number
): number => {
  if (lookupResult) {
    return lookupResult.totalReports;
  }
  return warningsCount;
};

const shouldShowEmptyCatalogue = ({
  hasError,
  isFiltering,
  isPending,
  warningCount,
}: {
  hasError: boolean;
  isFiltering: boolean;
  isPending: boolean;
  warningCount: number;
}): boolean => !isFiltering && !isPending && !hasError && warningCount === 0;

const renderCatalogueItems = ({
  isFiltering,
  isLoading,
  lookupResult,
  warnings,
  warningsQueryError,
}: {
  isFiltering: boolean;
  isLoading: boolean;
  lookupResult: PublicRiskIdentifierLookup | null;
  warnings: PublicRiskWarning[];
  warningsQueryError: boolean;
}) => {
  if (isLoading) {
    return (
      <ItemGroup aria-busy="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <RiskWarningListItemSkeleton key={index} />
        ))}
      </ItemGroup>
    );
  }

  if (warningsQueryError || (isFiltering && !lookupResult?.exactMatch)) {
    return null;
  }

  return (
    <PublicRiskWarningItems lookupResult={lookupResult} warnings={warnings} />
  );
};

export const PublicRiskWarningCatalogue = ({
  emptyLookupContent,
  isLoading = false,
  isLoadingMore = false,
  lookupResult = null,
  onLoadMore,
}: PublicRiskWarningCatalogueProps) => {
  const warningsQuery = usePublicRiskWarnings();
  const warnings = warningsQuery.data ?? [];
  const isFiltering = lookupResult !== null;
  const isPending = isLoading || (!isFiltering && warningsQuery.isPending);
  const warningCount = getWarningCount(lookupResult, warnings.length);
  const showEmptyCatalogue = shouldShowEmptyCatalogue({
    hasError: warningsQuery.isError,
    isFiltering,
    isPending,
    warningCount: warnings.length,
  });

  return (
    <section
      aria-labelledby="risk-warning-results-heading"
      className="grid gap-5"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2
            className="font-bold text-2xl tracking-tight"
            id="risk-warning-results-heading"
          >
            Tố cáo đã công khai
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {getCatalogueDescription(lookupResult)}
          </p>
        </div>
        {isPending ? (
          <Skeleton className="h-5 w-20 rounded-full" />
        ) : (
          <Badge variant="secondary">{warningCount} tố cáo</Badge>
        )}
      </div>

      {warningsQuery.isError ? (
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Không thể tải cảnh báo</AlertTitle>
          <AlertDescription>
            Vui lòng thử lại sau. Không có dữ liệu riêng tư nào được đưa vào
            thông báo lỗi.
          </AlertDescription>
        </Alert>
      ) : null}

      {renderCatalogueItems({
        isFiltering,
        isLoading: isPending,
        lookupResult,
        warnings,
        warningsQueryError: warningsQuery.isError,
      })}

      {showEmptyCatalogue ? (
        <div className="rounded-xl border border-dashed p-5 text-sm">
          <p className="text-muted-foreground">
            Chưa có tố cáo Avin nào được duyệt công khai.
          </p>
        </div>
      ) : null}

      {isFiltering && !lookupResult.exactMatch && !isPending ? (
        <div className="grid gap-3 rounded-xl border border-dashed p-5 text-sm">
          <p className="text-muted-foreground">
            Chưa tìm thấy cảnh báo công khai trùng khớp. Điều này không có nghĩa
            đối tượng hoặc giao dịch an toàn.
          </p>
          {emptyLookupContent}
        </div>
      ) : null}

      {isFiltering && lookupResult.hasMore && onLoadMore && !isPending ? (
        <div className="flex justify-center">
          <Button
            disabled={isLoadingMore}
            onClick={onLoadMore}
            type="button"
            variant="outline"
          >
            {isLoadingMore ? "Đang tải..." : "Xem thêm"}
          </Button>
        </div>
      ) : null}
    </section>
  );
};
