import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { Card } from "@avin/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@avin/ui/components/dialog";
import { Skeleton } from "@avin/ui/components/skeleton";
import { cn } from "@avin/ui/lib/utils";
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  BankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChatCircleDotsIcon,
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  CurrencyCircleDollarIcon,
  FileImageIcon,
  FileTextIcon,
  GlobeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ShieldWarningIcon,
  UserCircleIcon,
  UserIcon,
  WalletIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { Link, useParams } from "@tanstack/react-router";
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { getSafeEvidenceHref } from "@/utils/get-safe-evidence-href";

import { usePublicRiskWarning } from "../api/risk-warning-api";

interface EvidenceItem {
  contentType: string;
  id: string;
  kind: string;
  publicUrl: string;
  sizeBytes: number;
}

const RISK_REPORT_TYPE_LABELS = {
  BANK_WALLET_PHONE: "Tài khoản ngân hàng · ví điện tử · số điện thoại",
  MALICIOUS_WEBSITE: "Website có dấu hiệu rủi ro",
  SOCIAL_GAME_ACCOUNT: "Tài khoản social / game",
} as const;

const IDENTIFIER_LABELS: Record<string, string> = {
  BANK_ACCOUNT: "STK",
  PHONE: "Số điện thoại",
  PLATFORM_ACCOUNT: "Tài khoản nền tảng",
  SOCIAL_ACCOUNT: "Tài khoản MXH",
  WALLET_ACCOUNT: "Ví điện tử",
  WEBSITE: "Website",
};

const IDENTIFIER_ICONS: Record<string, typeof ShieldWarningIcon> = {
  BANK_ACCOUNT: CreditCardIcon,
  PHONE: PhoneIcon,
  PLATFORM_ACCOUNT: UserCircleIcon,
  SOCIAL_ACCOUNT: UserCircleIcon,
  WALLET_ACCOUNT: WalletIcon,
  WEBSITE: GlobeIcon,
};

const getIdentifierIcon = (type: string) =>
  IDENTIFIER_ICONS[type] ?? ShieldWarningIcon;

const riskWarningDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});
const riskWarningLossFormatter = new Intl.NumberFormat("vi-VN");

const formatDate = (value: string | null): string =>
  value ? riskWarningDateFormatter.format(new Date(value)) : "Chưa xác định";

const formatLoss = (value: number | null): string =>
  value === null
    ? "Chưa công bố"
    : `${riskWarningLossFormatter.format(value)} VND`;

const formatWarningStatus = (status: string): string => {
  if (status === "CORRECTED") {
    return "Đã cập nhật";
  }
  if (status === "REMOVED") {
    return "Đã gỡ";
  }
  if (status === "PUBLISHED") {
    return "Đã công khai";
  }
  return "Đã xem xét";
};

const isLikelyUrl = (value: string): boolean => {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("facebook.com/") ||
    trimmed.startsWith("fb.com/") ||
    trimmed.startsWith("t.me/") ||
    trimmed.startsWith("tiktok.com/") ||
    trimmed.startsWith("zalo.me/") ||
    trimmed.startsWith("instagram.com/") ||
    trimmed.startsWith("youtube.com/") ||
    trimmed.startsWith("twitter.com/") ||
    trimmed.startsWith("x.com/")
  );
};

const getNormalizedUrl = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const IdentifierValueDisplay = ({ value }: { value: string }) => {
  if (isLikelyUrl(value)) {
    const href = getNormalizedUrl(value);
    return (
      <a
        className="inline-flex items-center gap-1.5 break-all font-mono text-primary underline underline-offset-4 hover:text-primary/80"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span>{value}</span>
        <ArrowSquareOutIcon className="size-3.5 shrink-0" />
      </a>
    );
  }

  return <span className="font-mono">{value}</span>;
};

const DetailRow = ({
  children,
  className,
  icon: Icon,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: React.ElementType;
  label: string;
}) => (
  <div
    className={cn(
      "grid gap-2 px-5 py-3.5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-start sm:gap-6 sm:px-6",
      className
    )}
  >
    <dt className="flex items-center gap-2.5 font-medium text-muted-foreground text-sm">
      {Icon ? (
        <Icon className="size-4 shrink-0 text-muted-foreground/80" />
      ) : null}
      <span>{label}</span>
    </dt>
    <dd className="min-w-0 font-medium break-words text-foreground text-sm">
      {children}
    </dd>
  </div>
);

const PublicWarningStatusNotice = ({ status }: { status: string }) => {
  if (status === "REMOVED") {
    return (
      <Alert className="border-destructive/30 bg-destructive/5">
        <AlertTitle>Cảnh báo đã được gỡ</AlertTitle>
        <AlertDescription>
          Nội dung và bằng chứng công khai không còn hiển thị.
        </AlertDescription>
      </Alert>
    );
  }
  return null;
};

const WarningEvidenceGallery = ({
  evidence,
  onSelectEvidence,
}: {
  evidence: readonly EvidenceItem[];
  onSelectEvidence: (item: EvidenceItem) => void;
}) => {
  if (evidence.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Chưa có ảnh bằng chứng công khai.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-3">
        {evidence.map((item, idx) => (
          // oxlint-disable-next-line react/forbid-elements -- evidence image thumbnail trigger
          <button
            className="group relative h-28 w-24 shrink-0 overflow-hidden rounded-xl border bg-muted transition-all hover:ring-2 hover:ring-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-36 sm:w-28"
            key={item.id}
            onClick={() => onSelectEvidence(item)}
            type="button"
          >
            {item.contentType.startsWith("image/") ? (
              <img
                alt={`Bằng chứng ${idx + 1}: ${item.kind}`}
                className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                src={item.publicUrl}
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center p-1 text-center">
                <FileImageIcon
                  aria-hidden="true"
                  className="size-6 text-muted-foreground"
                />
                <span className="mt-1 w-full truncate px-1 text-[10px] text-muted-foreground">
                  {item.kind}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        * Nhấn vào ảnh để xem chi tiết
      </p>
    </div>
  );
};

const MIN_EVIDENCE_ZOOM = 1;
const MAX_EVIDENCE_ZOOM = 3;
const EVIDENCE_ZOOM_STEP = 0.5;

const clampEvidenceZoom = (value: number): number =>
  Math.min(MAX_EVIDENCE_ZOOM, Math.max(MIN_EVIDENCE_ZOOM, value));

const EvidencePreviewModal = ({
  evidence,
  evidenceItems,
  onClose,
  onSelectEvidence,
}: {
  evidence: EvidenceItem | null;
  evidenceItems: readonly EvidenceItem[];
  onClose: () => void;
  onSelectEvidence: (item: EvidenceItem) => void;
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const shouldReduceMotion = Boolean(useReducedMotion());
  const dragState = useRef<{
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_EVIDENCE_ZOOM);
  const evidenceIndex = evidence
    ? evidenceItems.findIndex((item) => item.id === evidence.id)
    : -1;

  const resetView = (): void => {
    setPosition({ x: 0, y: 0 });
    setZoom(MIN_EVIDENCE_ZOOM);
  };

  const updateZoom = (value: number): void => {
    const nextZoom = clampEvidenceZoom(value);
    setZoom(nextZoom);
    if (nextZoom === MIN_EVIDENCE_ZOOM) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>
  ): void => {
    if (zoom === MIN_EVIDENCE_ZOOM) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      x: position.x,
      y: position.y,
    };
    setIsPanning(true);
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLButtonElement>
  ): void => {
    if (!dragState.current || !imageRef.current?.parentElement) {
      return;
    }
    const viewport = imageRef.current.parentElement;
    const horizontalLimit = (viewport.clientWidth * (zoom - 1)) / 2;
    const verticalLimit = (viewport.clientHeight * (zoom - 1)) / 2;
    const x = dragState.current.x + event.clientX - dragState.current.startX;
    const y = dragState.current.y + event.clientY - dragState.current.startY;
    setPosition({
      x: Math.min(horizontalLimit, Math.max(-horizontalLimit, x)),
      y: Math.min(verticalLimit, Math.max(-verticalLimit, y)),
    });
  };

  const stopPanning = (): void => {
    dragState.current = null;
    setIsPanning(false);
  };

  const handleClose = (): void => {
    resetView();
    onClose();
  };

  const isPointInsideImage = (x: number, y: number): boolean => {
    const imageBounds = imageRef.current?.getBoundingClientRect();
    return Boolean(
      imageBounds &&
      x >= imageBounds.left &&
      x <= imageBounds.right &&
      y >= imageBounds.top &&
      y <= imageBounds.bottom
    );
  };

  const selectRelativeEvidence = useCallback(
    (offset: number): void => {
      if (evidenceIndex < 0 || evidenceItems.length < 2) {
        return;
      }
      const nextIndex =
        (evidenceIndex + offset + evidenceItems.length) % evidenceItems.length;
      const nextEvidence = evidenceItems[nextIndex];
      if (nextEvidence) {
        setPosition({ x: 0, y: 0 });
        setZoom(MIN_EVIDENCE_ZOOM);
        onSelectEvidence(nextEvidence);
      }
    },
    [evidenceIndex, evidenceItems, onSelectEvidence]
  );

  useEffect(() => {
    if (!evidence || evidenceItems.length < 2) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectRelativeEvidence(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        selectRelativeEvidence(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [evidence, evidenceItems.length, selectRelativeEvidence]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
      open={Boolean(evidence)}
    >
      <DialogContent
        className="!h-[100dvh] !w-screen !max-w-none !gap-0 !rounded-none !border-0 !bg-transparent !p-0 !shadow-none !ring-0 sm:!max-w-none"
        onClick={handleClose}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Xem ảnh bằng chứng</DialogTitle>
        </DialogHeader>
        {evidence ? (
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/90">
            <span className="absolute left-4 top-4 z-10 rounded-md bg-black/60 px-2 py-1 font-medium text-sm text-white">
              {evidenceIndex + 1} / {evidenceItems.length}
            </span>
            <div className="flex size-full items-center justify-center overflow-hidden">
              {evidence.contentType.startsWith("image/") ? (
                // oxlint-disable-next-line react/forbid-elements -- pan/zoom canvas interactive container
                <button
                  aria-label="Phóng to hoặc di chuyển ảnh bằng chứng"
                  className={cn(
                    "flex size-full items-center justify-center overflow-hidden touch-none",
                    zoom > MIN_EVIDENCE_ZOOM ? "cursor-grab" : "cursor-zoom-in",
                    isPanning && "cursor-grabbing"
                  )}
                  onDoubleClick={(event) => {
                    if (!isPointInsideImage(event.clientX, event.clientY)) {
                      return;
                    }
                    updateZoom(
                      zoom === MIN_EVIDENCE_ZOOM
                        ? MIN_EVIDENCE_ZOOM + EVIDENCE_ZOOM_STEP * 2
                        : MIN_EVIDENCE_ZOOM
                    );
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isPointInsideImage(event.clientX, event.clientY)) {
                      handleClose();
                    }
                  }}
                  onPointerCancel={stopPanning}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={stopPanning}
                  onWheel={(event) => {
                    event.preventDefault();
                    updateZoom(
                      zoom +
                        (event.deltaY < 0
                          ? EVIDENCE_ZOOM_STEP
                          : -EVIDENCE_ZOOM_STEP)
                    );
                  }}
                  type="button"
                >
                  <img
                    alt={`Bằng chứng: ${evidence.kind}`}
                    className="max-h-full max-w-full object-contain select-none"
                    draggable={false}
                    ref={imageRef}
                    src={evidence.publicUrl}
                    style={{
                      transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom})`,
                      transition:
                        shouldReduceMotion || isPanning
                          ? "none"
                          : "transform 200ms cubic-bezier(0.23, 1, 0.32, 1)",
                    }}
                  />
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileImageIcon className="size-12 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground text-sm">
                    Tệp không thể xem trước trực tiếp.
                  </p>
                </div>
              )}
            </div>
            {evidenceItems.length > 1 ? (
              <>
                <Button
                  aria-label="Ảnh bằng chứng trước"
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 text-white hover:bg-black/80"
                  onClick={(event) => {
                    event.stopPropagation();
                    selectRelativeEvidence(-1);
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <CaretLeftIcon className="size-6" weight="bold" />
                </Button>
                <Button
                  aria-label="Ảnh bằng chứng tiếp theo"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 text-white hover:bg-black/80"
                  onClick={(event) => {
                    event.stopPropagation();
                    selectRelativeEvidence(1);
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <CaretRightIcon className="size-6" weight="bold" />
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const WarningDisclaimerAndStats = ({
  publishedAt,
  suspectName,
}: {
  publishedAt: string | null;
  suspectName?: string | null;
}) => (
  <div className="space-y-2 border-t bg-muted/15 px-5 py-4 text-muted-foreground text-xs sm:px-6 sm:text-sm">
    <div className="flex items-start gap-2">
      <WarningIcon
        className="mt-0.5 size-4 shrink-0 text-amber-500"
        weight="fill"
      />
      <p>
        <span className="font-semibold text-foreground">Lưu ý:</span> Thông tin
        chỉ mang tính chất cảnh báo và tham khảo đối chiếu cộng đồng trước khi
        giao dịch, không phải kết luận chính thức.
      </p>
    </div>
    <div className="flex items-start gap-2">
      <ShieldCheckIcon
        className="mt-0.5 size-4 shrink-0 text-primary"
        weight="fill"
      />
      <p>
        <span className="font-semibold text-foreground">Thống kê:</span> Cảnh
        báo{" "}
        {suspectName ? (
          <>
            về <strong>{suspectName}</strong>{" "}
          </>
        ) : null}
        được duyệt và công khai lúc{" "}
        <span className="font-medium text-foreground">
          {formatDate(publishedAt)}
        </span>{" "}
        trên hệ thống Avin Check.
      </p>
    </div>
  </div>
);

const WarningQuickActionBar = ({ reportId }: { reportId: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Đã sao chép liên kết cảnh báo.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép liên kết.");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="gap-1.5"
          onClick={handleCopyLink}
          size="sm"
          variant="outline"
        >
          {copied ? (
            <CheckIcon className="size-4 text-emerald-500" />
          ) : (
            <CopyIcon className="size-4" />
          )}
          {copied ? "Đã sao chép" : "Copy link"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Link
          className="inline-flex items-center gap-1.5 font-medium text-amber-600 hover:text-amber-700 hover:underline dark:text-amber-400 dark:hover:text-amber-300"
          search={{ reportId }}
          to="/avin-check/correction"
        >
          <WarningCircleIcon className="size-4" />
          Yêu cầu gỡ
        </Link>
        <Link
          className="inline-flex items-center gap-1.5 font-medium text-primary underline underline-offset-4"
          to="/avin-check/report"
        >
          <ArrowSquareOutIcon className="size-4" />
          Gửi report mới
        </Link>
      </div>
    </div>
  );
};

export const PublicRiskWarningDetailSkeleton = () => (
  <Shell
    aria-busy="true"
    as="div"
    className="mx-auto w-full max-w-5xl gap-6"
    variant="default"
  >
    <Link
      className="inline-flex w-fit items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
      to="/avin-check/warnings"
    >
      <ArrowLeftIcon aria-hidden="true" />
      Quay lại danh mục cảnh báo
    </Link>

    <header className="border-b pb-6">
      <Skeleton className="h-8 w-72 rounded-lg sm:h-9 sm:w-96" />
    </header>

    <Card className="gap-0 overflow-hidden border border-border/80 p-0 py-0 shadow-sm">
      <div className="border-b bg-muted/30 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldWarningIcon className="size-5" weight="bold" />
            </div>
            <div>
              <h2 className="font-semibold text-base sm:text-lg">
                Thông tin cảnh báo
              </h2>
              <p className="text-muted-foreground text-xs">
                Đối chiếu các thông tin dưới đây trước khi giao dịch.
              </p>
            </div>
          </div>
          <Skeleton className="h-5 w-24 rounded-3xl" />
        </div>
      </div>

      <dl className="divide-y divide-border/60">
        <DetailRow icon={UserIcon} label="Chủ Tk / Đối tượng">
          <Skeleton className="h-4 w-36 rounded-md" />
        </DetailRow>

        <DetailRow icon={CreditCardIcon} label="STK">
          <Skeleton className="h-4 w-28 rounded-md" />
        </DetailRow>

        <DetailRow icon={BankIcon} label="Ngân hàng">
          <Skeleton className="h-4 w-48 rounded-md" />
        </DetailRow>

        <DetailRow icon={PhoneIcon} label="Số điện thoại">
          <Skeleton className="h-4 w-32 rounded-md" />
        </DetailRow>

        <DetailRow icon={GlobeIcon} label="Nền tảng">
          <Skeleton className="h-4 w-3/4 max-w-md rounded-md" />
        </DetailRow>

        <DetailRow icon={FileImageIcon} label="Ảnh Bằng Chứng">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-28 w-24 rounded-xl sm:h-36 sm:w-28" />
              <Skeleton className="h-28 w-24 rounded-xl sm:h-36 sm:w-28" />
            </div>
            <Skeleton className="h-3 w-40 rounded-md" />
          </div>
        </DetailRow>

        <DetailRow
          icon={CurrencyCircleDollarIcon}
          label="Số tiền người tố cáo khai"
        >
          <Skeleton className="h-5 w-32 rounded-md" />
        </DetailRow>

        <DetailRow icon={FileTextIcon} label="Nội dung cảnh báo">
          <div className="space-y-3">
            <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </div>
            <Skeleton className="h-3 w-64 rounded-md" />
          </div>
        </DetailRow>
      </dl>

      <div className="space-y-2 border-t bg-muted/15 px-5 py-4 text-xs sm:px-6 sm:text-sm">
        <div className="flex items-start gap-2">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-full max-w-lg rounded-md" />
        </div>
        <div className="flex items-start gap-2">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-full max-w-md rounded-md" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3.5 sm:px-6">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
      </div>
    </Card>
  </Shell>
);

// oxlint-disable-next-line complexity
export const PublicRiskWarningDetailPage = () => {
  const { slug } = useParams({ from: "/(public)/avin-check/warning/$slug" });
  const warningQuery = usePublicRiskWarning(slug);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(
    null
  );

  if (warningQuery.isPending) {
    return <PublicRiskWarningDetailSkeleton />;
  }

  if (warningQuery.isError) {
    return (
      <Shell as="div" className="gap-6" variant="default">
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Không tìm thấy cảnh báo</AlertTitle>
          <AlertDescription>
            Cảnh báo có thể chưa được công khai hoặc đường dẫn không còn hợp lệ.
          </AlertDescription>
        </Alert>
        <Link
          className="inline-flex w-fit items-center gap-2 font-medium text-primary underline underline-offset-4"
          to="/avin-check/warnings"
        >
          <ArrowLeftIcon aria-hidden="true" />
          Quay lại danh mục cảnh báo
        </Link>
      </Shell>
    );
  }

  const warning = warningQuery.data;
  const title =
    warning.publicTitle ??
    warning.externalSource?.title ??
    RISK_REPORT_TYPE_LABELS[warning.type];
  const safePlatformUrl = warning.externalSource?.platformUrl
    ? getSafeEvidenceHref(warning.externalSource.platformUrl)
    : null;

  const bankAccountIdentifiers: typeof warning.identifiers = [];
  const phoneIdentifiers: typeof warning.identifiers = [];
  const otherIdentifiers: typeof warning.identifiers = [];
  for (const identifier of warning.identifiers) {
    if (identifier.type === "BANK_ACCOUNT") {
      bankAccountIdentifiers.push(identifier);
    } else if (identifier.type === "PHONE") {
      phoneIdentifiers.push(identifier);
    } else if (
      identifier.type !== "PLATFORM_ACCOUNT" &&
      !(identifier.type === "WEBSITE" && safePlatformUrl)
    ) {
      otherIdentifiers.push(identifier);
    }
  }
  const reportedAssets = warning.reportedAssets ?? [];
  const impersonatedIdentities = warning.impersonatedIdentities ?? [];

  return (
    <Shell
      as="div"
      className="mx-auto w-full max-w-5xl gap-6"
      variant="default"
    >
      <Link
        className="inline-flex w-fit items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        to="/avin-check/warnings"
      >
        <ArrowLeftIcon aria-hidden="true" />
        Quay lại
      </Link>

      <header className="border-b pb-6">
        <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
          {title}
        </h1>
      </header>

      <PublicWarningStatusNotice status={warning.status} />

      <Card className="gap-0 overflow-hidden border border-border/80 p-0 py-0 shadow-sm">
        <div className="border-b bg-muted/30 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <ShieldWarningIcon className="size-5" weight="bold" />
              </div>
              <div>
                <h2 className="font-semibold text-base sm:text-lg">
                  Thông tin cảnh báo
                </h2>
                <p className="text-muted-foreground text-xs">
                  Đối chiếu các thông tin dưới đây trước khi giao dịch.
                </p>
              </div>
            </div>
            <Badge
              className="gap-1.5 font-medium"
              variant={
                warning.status === "PUBLISHED" ? "destructive" : "secondary"
              }
            >
              <ShieldWarningIcon aria-hidden="true" />
              {formatWarningStatus(warning.status)}
            </Badge>
          </div>
        </div>

        <dl className="divide-y divide-border/60">
          {warning.externalSource?.suspectName ? (
            <DetailRow icon={UserIcon} label="Chủ Tk / Đối tượng">
              <span className="font-semibold text-foreground">
                {warning.externalSource.suspectName}
              </span>
            </DetailRow>
          ) : null}

          {bankAccountIdentifiers.map((identifier) => (
            <DetailRow
              icon={CreditCardIcon}
              key={`${identifier.type}-${identifier.maskedValue}`}
              label="STK"
            >
              <div className="inline-flex items-center gap-2 font-bold font-mono text-foreground">
                <span>
                  {identifier.publicValue ?? identifier.maskedValue}
                  {identifier.institutionName
                    ? ` · ${identifier.institutionName}`
                    : ""}
                  {identifier.holderName ? ` · ${identifier.holderName}` : ""}
                </span>
                <WarningIcon
                  aria-label="Tài khoản bị cảnh báo"
                  className="size-4 text-amber-500"
                  weight="fill"
                />
              </div>
            </DetailRow>
          ))}

          {warning.externalSource?.bankName ? (
            <DetailRow icon={BankIcon} label="Ngân hàng">
              {warning.externalSource.bankName}
            </DetailRow>
          ) : null}

          {phoneIdentifiers.map((identifier) => (
            <DetailRow
              icon={getIdentifierIcon(identifier.type)}
              key={`${identifier.type}-${identifier.maskedValue}`}
              label={IDENTIFIER_LABELS[identifier.type] ?? identifier.type}
            >
              <span className="font-mono">
                {identifier.publicValue ?? identifier.maskedValue}
              </span>
            </DetailRow>
          ))}

          {safePlatformUrl ? (
            <DetailRow icon={GlobeIcon} label="Nền tảng">
              <a
                className="break-all font-mono text-primary underline underline-offset-4"
                href={safePlatformUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {safePlatformUrl}
              </a>
            </DetailRow>
          ) : null}

          {otherIdentifiers.map((identifier) => (
            <DetailRow
              icon={getIdentifierIcon(identifier.type)}
              key={`${identifier.type}-${identifier.maskedValue}`}
              label={IDENTIFIER_LABELS[identifier.type] ?? identifier.type}
            >
              <IdentifierValueDisplay
                value={identifier.publicValue ?? identifier.maskedValue}
              />
            </DetailRow>
          ))}

          {reportedAssets.map((identifier) => (
            <DetailRow
              icon={UserCircleIcon}
              key={`asset-${identifier.type}-${identifier.maskedValue}`}
              label="Tài khoản/tài sản được báo cáo"
            >
              <div className="space-y-1">
                <IdentifierValueDisplay
                  value={identifier.publicValue ?? identifier.maskedValue}
                />
                <p className="font-normal text-muted-foreground text-xs">
                  Đây là cảnh báo về lịch sử giao dịch/tài sản; không phải kết
                  luận rằng chủ tài khoản hiện tại là kẻ lừa đảo.
                </p>
              </div>
            </DetailRow>
          ))}

          {impersonatedIdentities.map((identifier) => (
            <DetailRow
              icon={UserCircleIcon}
              key={`impersonated-${identifier.type}-${identifier.maskedValue}`}
              label="Danh tính chính chủ bị mạo danh"
            >
              <IdentifierValueDisplay
                value={identifier.publicValue ?? identifier.maskedValue}
              />
            </DetailRow>
          ))}

          <DetailRow icon={FileImageIcon} label="Ảnh Bằng Chứng">
            <WarningEvidenceGallery
              evidence={warning.evidence}
              onSelectEvidence={setSelectedEvidence}
            />
          </DetailRow>

          <DetailRow
            icon={CurrencyCircleDollarIcon}
            label="Số tiền người tố cáo khai"
          >
            <span className="font-bold text-base text-destructive">
              {formatLoss(warning.claimedLoss)}
            </span>
          </DetailRow>

          <DetailRow icon={FileTextIcon} label="Nội dung cảnh báo">
            <div className="space-y-3">
              <div className="rounded-xl border bg-muted/20 p-4 font-normal text-sm leading-relaxed whitespace-pre-wrap">
                {warning.publicNarrative ?? warning.publicSummary}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <ChatCircleDotsIcon className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  Mọi thông tin bổ sung hoặc cập nhật mới, vui lòng gửi yêu cầu
                  đính chính bên dưới bài đăng.
                </span>
              </div>
            </div>
          </DetailRow>
        </dl>

        <WarningDisclaimerAndStats
          publishedAt={warning.publishedAt}
          suspectName={warning.externalSource?.suspectName}
        />

        <WarningQuickActionBar reportId={warning.reportId} />
      </Card>

      <EvidencePreviewModal
        evidence={selectedEvidence}
        evidenceItems={warning.evidence}
        onClose={() => setSelectedEvidence(null)}
        onSelectEvidence={setSelectedEvidence}
      />
    </Shell>
  );
};
