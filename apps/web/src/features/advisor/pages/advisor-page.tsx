import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import {
  clearAdvisorHandoffDraft,
  getAdvisorHandoffDraft,
  saveAdvisorHandoffDraft,
} from "@/features/advisor/advisor-handoff";
import type { AdvisorHandoffDraft } from "@/features/advisor/advisor-handoff";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";
import { serverURL } from "@/utils/server-url";

const CAPABILITY_STORAGE_KEY = "avin.advisor.capability";
const SESSION_STORAGE_KEY = "avin.advisor.session";
const CONSENT_STORAGE_KEY = "avin.advisor.consent";
const EMPTY_UUID = "00000000-0000-4000-8000-000000000000";
type AdvisorIdempotencyKey =
  `${string}-${string}-${string}-${string}-${string}`;

const ADVISOR_ATTACHMENT_MAX_PER_MESSAGE = 3;
const ADVISOR_ATTACHMENT_MAX_PER_SESSION = 5;
const ADVISOR_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const ADVISOR_ATTACHMENT_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface AdvisorAttachmentPreview {
  byteSize: number;
  contentType: string;
  expiresAt: string;
  fileName: string;
  height: number;
  id: string;
  previewUrl: string;
  width: number;
}

interface AdvisorHandoffAttachment {
  byteSize: number;
  contentType: string;
  fileName: string;
  height: number;
  id: string;
  previewUrl?: string;
  width: number;
}

interface AdvisorHandoffSelection {
  attachmentIds: string[];
  attachments: AdvisorHandoffAttachment[];
  handoffId: string;
  includeSummaryInCheckout: boolean;
  listingId: string;
  recommendationId: string;
  sessionId: string;
  summary: string;
}

const getAttachmentErrorMessage = (payload: unknown): string => {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }
  return "Không thể xử lý ảnh Advisor.";
};

const createCapability = (): string => {
  const random = globalThis.crypto?.randomUUID;
  if (random) {
    return `${random.call(globalThis.crypto)}${random.call(globalThis.crypto)}`;
  }

  const getRandomValues = globalThis.crypto?.getRandomValues;
  if (!getRandomValues) {
    throw new Error("Secure browser randomness is required for Advisor.");
  }
  const bytes = new Uint8Array(48);
  getRandomValues.call(globalThis.crypto, bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
};

const getStoredValue = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStoredValue = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing can deny localStorage; the active page can still work.
  }
};

const removeStoredValue = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Private browsing can deny localStorage; the active page can still work.
  }
};

interface AdvisorQuestion {
  allowFreeText: true;
  id: string | null;
  options: { label: string; value: string }[];
  prompt: string;
}

const parseQuestion = (value: unknown): AdvisorQuestion | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as {
    allowFreeText?: unknown;
    id?: unknown;
    options?: unknown;
    prompt?: unknown;
  };
  if (
    candidate.allowFreeText !== true ||
    (candidate.id !== null && typeof candidate.id !== "string") ||
    typeof candidate.prompt !== "string" ||
    !Array.isArray(candidate.options)
  ) {
    return null;
  }
  const options = candidate.options.filter(
    (option): option is { label: string; value: string } =>
      Boolean(
        option &&
        typeof option === "object" &&
        "label" in option &&
        typeof option.label === "string" &&
        "value" in option &&
        typeof option.value === "string"
      )
  );
  return options.length === candidate.options.length
    ? {
        allowFreeText: true,
        id: candidate.id as string | null,
        options,
        prompt: candidate.prompt,
      }
    : null;
};

const parseBrowsePath = (value: unknown): string | null =>
  typeof value === "string" && value.startsWith("/") ? value : null;

const getListingPathWithAdvisorPackage = (
  listingPath: string,
  packageId: string | null
): string => {
  if (!packageId) {
    return listingPath;
  }
  const separator = listingPath.includes("?") ? "&" : "?";
  return `${listingPath}${separator}advisorPackageId=${encodeURIComponent(packageId)}`;
};

const formatWarranty = (policy: unknown): string => {
  if (!policy || typeof policy !== "object") {
    return "Chính sách bảo hành theo Listing";
  }
  if (
    "kind" in policy &&
    policy.kind === "TIMED" &&
    "durationHours" in policy &&
    typeof policy.durationHours === "number"
  ) {
    return `Bảo hành ${policy.durationHours} giờ`;
  }
  return "Không có bảo hành";
};

const ConsentPanel = ({
  checked,
  onAccept,
  onChange,
  pending,
}: {
  checked: boolean;
  onAccept: () => void;
  onChange: (checked: boolean) => void;
  pending: boolean;
}) => (
  <Card className="mx-auto w-full max-w-2xl border-primary/20 shadow-lg">
    <CardHeader>
      <CardTitle>Trước khi bắt đầu với Service Advisor</CardTitle>
      <CardDescription>
        Advisor dùng nội dung bạn gửi để gợi ý Listing SERVICE phù hợp. Phiên
        Visitor được giữ tối đa 24 giờ không hoạt động; User đã đăng nhập tối đa
        30 ngày. Không gửi password, OTP, access token, thông tin thanh toán hay
        giấy tờ định danh.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <p className="text-muted-foreground text-sm">
        Bạn có thể xem đầy đủ tại{" "}
        <Link className="font-medium text-primary underline" to="/terms">
          Terms
        </Link>{" "}
        và{" "}
        <Link className="font-medium text-primary underline" to="/privacy">
          Privacy
        </Link>
        . Advisor chỉ đưa ra gợi ý do AI tạo; Listing detail và package selector
        vẫn là nguồn chính thức để quyết định mua.
      </p>
      <label
        className="flex items-start gap-3 text-sm"
        htmlFor="advisor-consent"
      >
        <input
          checked={checked}
          className="mt-1 size-4 accent-primary"
          id="advisor-consent"
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span>
          Tôi đã đọc và đồng ý với thông báo xử lý Advisor Consent phiên bản v1.
        </span>
      </label>
      <Button disabled={!checked || pending} onClick={onAccept} type="button">
        {pending ? "Đang khởi tạo..." : "Bắt đầu tư vấn"}
      </Button>
    </CardContent>
  </Card>
);

const ConversationMessage = ({
  role,
  text,
}: {
  role: "USER" | "ASSISTANT";
  text: string;
}) => (
  <div className={`flex ${role === "USER" ? "justify-end" : "justify-start"}`}>
    <div
      className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
        role === "USER"
          ? "bg-primary text-primary-foreground"
          : "border bg-card text-foreground"
      }`}
    >
      {text}
    </div>
  </div>
);

const RecommendationCard = ({
  onListingClick,
  onSelect,
  recommendation,
}: {
  onListingClick: (listingId: string) => void;
  onSelect: (recommendationId: string, listingId: string) => void;
  recommendation: {
    id: string;
    isAvailable: boolean;
    isCurrent: boolean;
    label: string;
    listings: {
      completedOrderCount: number;
      id: string;
      isAvailable: boolean;
      listingPath: string;
      priceAmount: number;
      processingTimeHours: number | null;
      ratingCount: number;
      ratingScore: number;
      reasons: string[];
      seller: { id: string; name: string };
      servicePackage: {
        id: string;
        name: string;
        priceAmount: number;
        processingTimeHours: number;
        warrantyPolicy: unknown;
      } | null;
      title: string;
      warrantyPolicy: unknown;
    }[];
  };
}) => (
  <Card
    className={
      recommendation.isAvailable
        ? "border-primary/30 bg-primary/5"
        : "border-destructive/30 bg-destructive/5"
    }
  >
    <CardHeader className="pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">{recommendation.label}</CardTitle>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {recommendation.isCurrent ? (
            <span className="rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground text-xs">
              Gợi ý hiện tại
            </span>
          ) : (
            <span className="rounded-full border px-2.5 py-1 text-muted-foreground text-xs">
              Gợi ý trước đó
            </span>
          )}
          {recommendation.isAvailable ? (
            <Button
              onClick={() => {
                const [firstListing] = recommendation.listings;
                if (firstListing) {
                  onSelect(recommendation.id, firstListing.id);
                }
              }}
              size="sm"
              type="button"
            >
              Chọn để tạo tóm tắt
            </Button>
          ) : null}
        </div>
      </div>
      <CardDescription>
        {recommendation.isAvailable
          ? "Hãy mở Listing để kiểm tra chi tiết và tự chọn package. Advisor không tự thêm vào Cart."
          : "Một hoặc nhiều lựa chọn không còn khả dụng. Bạn có thể duyệt catalog để tìm lựa chọn mới."}
      </CardDescription>
    </CardHeader>
    <CardContent className="grid gap-3 lg:grid-cols-3">
      {recommendation.listings.map((listing) => (
        <article
          className="flex flex-col rounded-xl border bg-background p-4"
          key={listing.id}
        >
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-sm">{listing.title}</h3>
            <p className="text-muted-foreground text-xs">
              Seller: {listing.seller.name}
            </p>
            <p className="font-bold text-primary text-sm">
              {formatVND(listing.priceAmount)}
            </p>
            <p className="text-muted-foreground text-xs">
              Đánh giá: {listing.ratingScore.toFixed(1)} ({listing.ratingCount})
              · Đã xử lý {listing.completedOrderCount}
            </p>
            {listing.processingTimeHours ? (
              <p className="text-muted-foreground text-xs">
                Xử lý dự kiến: {listing.processingTimeHours} giờ
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              {formatWarranty(listing.warrantyPolicy)}
            </p>
            {listing.servicePackage ? (
              <p className="rounded-lg bg-muted/60 p-2 text-xs">
                Có thể xem trước gói:{" "}
                <strong>{listing.servicePackage.name}</strong> (
                {formatVND(listing.servicePackage.priceAmount)})
              </p>
            ) : null}
            <ul className="space-y-1 text-muted-foreground text-xs">
              {listing.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          </div>
          {listing.isAvailable ? (
            <a
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 font-medium text-primary-foreground text-sm hover:bg-primary/90"
              href={getListingPathWithAdvisorPackage(
                listing.listingPath,
                listing.servicePackage?.id ?? null
              )}
              onClick={() => onListingClick(listing.id)}
            >
              Xem Listing và chọn gói
            </a>
          ) : (
            <p className="mt-4 rounded-md border border-destructive/30 px-3 py-2 text-destructive text-xs">
              Listing hoặc gói gợi ý đã không còn khả dụng.
            </p>
          )}
        </article>
      ))}
    </CardContent>
    {recommendation.isAvailable || (
      <div className="px-6 pb-6">
        <Link
          className="font-medium text-primary text-sm underline underline-offset-4"
          to="/category"
        >
          Duyệt catalog thủ công
        </Link>
      </div>
    )}
  </Card>
);

const AdvisorHandoffPanel = ({
  attachmentIds,
  attachments,
  includeSummaryInCheckout,
  listingId,
  onAttachmentToggle,
  onConfirm,
  onIncludeSummaryChange,
  onListingClick,
  onListingChange,
  onSummaryChange,
  pending,
  recommendation,
  summary,
}: {
  attachmentIds: string[];
  attachments: AdvisorHandoffAttachment[];
  includeSummaryInCheckout: boolean;
  listingId: string;
  onAttachmentToggle: (attachmentId: string) => void;
  onConfirm: () => void;
  onIncludeSummaryChange: (includeSummaryInCheckout: boolean) => void;
  onListingClick: (listingId: string) => void;
  onListingChange: (listingId: string) => void;
  onSummaryChange: (summary: string) => void;
  pending: boolean;
  recommendation:
    | {
        listings: {
          id: string;
          listingPath: string;
          servicePackage: { id: string; name: string } | null;
          title: string;
        }[];
      }
    | undefined;
  summary: string;
}) => {
  const selectedAttachments = new Set(attachmentIds);
  const listings = recommendation?.listings ?? [];
  return (
    <Card className="border-primary/40 bg-primary/5" id="advisor-handoff">
      <CardHeader>
        <CardTitle>Ngữ cảnh Advisor cho Checkout</CardTitle>
        <CardDescription>
          Tóm tắt chỉ được tạo sau khi bạn chọn recommendation. Bạn tự chọn ảnh
          và quyết định có đưa tóm tắt vào Buyer Checkout Note hay không; không
          có transcript nào được chuyển tự động.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {listings.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="font-semibold text-sm">
              Listing và package cần kiểm tra lại
            </legend>
            <div className="flex flex-wrap gap-2">
              {listings.map((listing) => (
                <Button
                  key={listing.id}
                  onClick={() => onListingChange(listing.id)}
                  size="sm"
                  type="button"
                  variant={listing.id === listingId ? "default" : "outline"}
                >
                  {listing.title}
                </Button>
              ))}
            </div>
            {listings.map((listing) =>
              listing.id === listingId ? (
                <a
                  className="inline-flex font-medium text-primary text-sm underline underline-offset-4"
                  href={getListingPathWithAdvisorPackage(
                    listing.listingPath,
                    listing.servicePackage?.id ?? null
                  )}
                  key={`${listing.id}-link`}
                  onClick={() => onListingClick(listing.id)}
                >
                  Mở Listing detail
                  {listing.servicePackage
                    ? ` · gói ${listing.servicePackage.name}`
                    : ""}
                </a>
              ) : null
            )}
          </fieldset>
        ) : null}

        <label
          className="grid gap-2 text-sm font-medium"
          htmlFor="advisor-summary"
        >
          Advisory Summary (có thể chỉnh sửa)
          <textarea
            className="min-h-36 resize-y rounded-lg border bg-background px-3 py-3 font-normal text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            id="advisor-summary"
            maxLength={2000}
            onChange={(event) => onSummaryChange(event.target.value)}
            value={summary}
          />
        </label>
        <label
          className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm"
          htmlFor="advisor-summary-in-checkout"
        >
          <input
            checked={includeSummaryInCheckout}
            className="mt-1 size-4 accent-primary"
            id="advisor-summary-in-checkout"
            onChange={(event) => onIncludeSummaryChange(event.target.checked)}
            type="checkbox"
          />
          <span>
            Đưa Advisory Summary vào Buyer Checkout Note (tuỳ chọn). Bạn vẫn có
            thể sửa lại ghi chú trong Cart.
          </span>
        </label>

        <fieldset className="space-y-3">
          <legend className="font-semibold text-sm">
            Chọn ảnh muốn dùng lại ({attachmentIds.length}/{attachments.length})
          </legend>
          {attachments.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {attachments.map((attachment) => (
                <li
                  className="rounded-lg border bg-background p-2"
                  key={attachment.id}
                >
                  <label className="grid gap-2 text-xs">
                    {attachment.previewUrl ? (
                      <img
                        alt={`Ảnh Advisor ${attachment.fileName}`}
                        className="aspect-square w-full rounded-md object-cover"
                        src={attachment.previewUrl}
                      />
                    ) : (
                      <span className="flex aspect-square items-center justify-center rounded-md bg-muted p-2 text-center text-muted-foreground">
                        Không xem trước được ảnh
                      </span>
                    )}
                    <span className="flex items-start gap-2">
                      <input
                        checked={selectedAttachments.has(attachment.id)}
                        className="mt-0.5 size-4 accent-primary"
                        onChange={() => onAttachmentToggle(attachment.id)}
                        type="checkbox"
                      />
                      <span className="truncate">{attachment.fileName}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed p-3 text-muted-foreground text-sm">
              Session này không có Advisory Attachment đã commit.
            </p>
          )}
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            Visitor cần đăng nhập và bấm “Liên kết tài khoản” trước khi chuyển
            ảnh sang Checkout.
          </p>
          <Button
            disabled={pending || !summary.trim()}
            onClick={onConfirm}
            type="button"
          >
            {pending ? "Đang xác nhận..." : "Xác nhận ngữ cảnh Advisor"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const AdvisorFeedbackPanel = ({
  attachments,
  onSubmitted,
  recommendationId,
  sessionId,
  visitorCapability,
}: {
  attachments: AdvisorHandoffAttachment[];
  onSubmitted: () => void;
  recommendationId: string;
  sessionId: string;
  visitorCapability: string;
}) => {
  const [sentiment, setSentiment] = useState<"NEGATIVE" | "POSITIVE" | null>(
    null
  );
  const [reason, setReason] = useState("");
  const [includeConversation, setIncludeConversation] = useState(false);
  const [attachmentsConsent, setAttachmentsConsent] = useState(false);
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const selectedAttachmentIds = new Set(attachmentIds);
  const feedbackMutation = useMutation(
    orpc.advisor.feedback.submit.mutationOptions()
  );

  const toggleAttachment = (attachmentId: string): void => {
    setAttachmentIds((current) =>
      current.includes(attachmentId)
        ? current.filter((id) => id !== attachmentId)
        : [...current, attachmentId]
    );
  };

  const submit = async (): Promise<void> => {
    if (!sentiment) {
      return;
    }
    try {
      await feedbackMutation.mutateAsync({
        attachmentIds,
        attachmentsConsent,
        includeConversation,
        reason: reason.trim() || undefined,
        recommendationId,
        sentiment,
        sessionId,
        visitorCapability,
      });
      onSubmitted();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể gửi Advisor Feedback."
      );
    }
  };

  return (
    <Card className="border-muted-foreground/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Đánh giá recommendation</CardTitle>
        <CardDescription>
          Feedback giúp cải thiện Advisor. Transcript và ảnh không được chia sẻ
          với Admin nếu bạn không chọn riêng bên dưới.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setSentiment("POSITIVE")}
            type="button"
            variant={sentiment === "POSITIVE" ? "default" : "outline"}
          >
            Hữu ích
          </Button>
          <Button
            onClick={() => setSentiment("NEGATIVE")}
            type="button"
            variant={sentiment === "NEGATIVE" ? "default" : "outline"}
          >
            Chưa phù hợp
          </Button>
        </div>
        <label
          className="grid gap-2 text-sm font-medium"
          htmlFor="advisor-feedback-reason"
        >
          Lý do (tuỳ chọn)
          <textarea
            className="min-h-20 resize-y rounded-lg border bg-background px-3 py-2 font-normal text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            id="advisor-feedback-reason"
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
        </label>
        <label
          className="flex items-start gap-3 text-sm"
          htmlFor="advisor-feedback-conversation"
        >
          <input
            checked={includeConversation}
            className="mt-1 size-4 accent-primary"
            id="advisor-feedback-conversation"
            onChange={(event) => setIncludeConversation(event.target.checked)}
            type="checkbox"
          />
          <span>
            Cho phép Admin xem transcript của session này để điều tra Feedback.
          </span>
        </label>
        {attachments.length > 0 ? (
          <fieldset className="space-y-2 rounded-lg border p-3">
            <legend className="px-1 font-medium text-sm">
              Ảnh chia sẻ kèm Feedback (mặc định không chọn)
            </legend>
            {attachments.map((attachment) => (
              <label
                className="flex items-center gap-2 text-sm"
                htmlFor={`feedback-attachment-${attachment.id}`}
                key={attachment.id}
              >
                <input
                  checked={selectedAttachmentIds.has(attachment.id)}
                  className="size-4 accent-primary"
                  id={`feedback-attachment-${attachment.id}`}
                  onChange={() => toggleAttachment(attachment.id)}
                  type="checkbox"
                />
                <span className="truncate">{attachment.fileName}</span>
              </label>
            ))}
            <label
              className="flex items-start gap-3 pt-1 text-xs"
              htmlFor="advisor-feedback-attachments-consent"
            >
              <input
                checked={attachmentsConsent}
                className="mt-0.5 size-4 accent-primary"
                disabled={attachmentIds.length === 0}
                id="advisor-feedback-attachments-consent"
                onChange={(event) =>
                  setAttachmentsConsent(event.target.checked)
                }
                type="checkbox"
              />
              <span>Tôi đồng ý riêng cho việc chia sẻ các ảnh đã chọn.</span>
            </label>
          </fieldset>
        ) : null}
        <Button
          disabled={feedbackMutation.isPending || !sentiment}
          onClick={() => void submit()}
          type="button"
        >
          {feedbackMutation.isPending ? "Đang gửi..." : "Gửi Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
};

// AVIN-50 keeps consent, generation, retry, and retention controls together so
// the resumable-session state machine remains explicit at the page boundary.
// oxlint-disable-next-line complexity, react-doctor/prefer-useReducer
export const AdvisorPage = () => {
  const capability = useMemo(() => {
    const stored = getStoredValue(CAPABILITY_STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const created = createCapability();
    setStoredValue(CAPABILITY_STORAGE_KEY, created);
    return created;
  }, []);
  const [sessionId, setSessionId] = useState(
    () => getStoredValue(SESSION_STORAGE_KEY) ?? ""
  );
  const [consentAccepted, setConsentAccepted] = useState(() =>
    Boolean(
      getStoredValue(CONSENT_STORAGE_KEY) && getStoredValue(SESSION_STORAGE_KEY)
    )
  );
  const [consentChecked, setConsentChecked] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<AdvisorAttachmentPreview[]>(
    []
  );
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<AdvisorAttachmentPreview[]>([]);
  const [handoffSelection, setHandoffSelection] =
    useState<AdvisorHandoffSelection | null>(null);
  const handoffPreviewUrlsRef = useRef<string[]>([]);
  const [retryRequest, setRetryRequest] = useState<{
    attachmentIds: string[];
    idempotencyKey: AdvisorIdempotencyKey;
    text: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    ...orpc.advisor.session.get.queryOptions({
      input: {
        sessionId: sessionId || EMPTY_UUID,
        visitorCapability: capability,
      },
    }),
    enabled: consentAccepted && Boolean(sessionId),
  });
  const consentMutation = useMutation(
    orpc.advisor.consent.record.mutationOptions()
  );
  const sessionMutation = useMutation(
    orpc.advisor.session.create.mutationOptions()
  );
  const turnMutation = useMutation(orpc.advisor.session.turn.mutationOptions());
  const linkMutation = useMutation(orpc.advisor.session.link.mutationOptions());
  const stopMutation = useMutation(orpc.advisor.session.stop.mutationOptions());
  const deleteMutation = useMutation(
    orpc.advisor.session.delete.mutationOptions()
  );
  const selectRecommendationMutation = useMutation(
    orpc.advisor.handoff.select.mutationOptions()
  );
  const confirmHandoffMutation = useMutation(
    orpc.advisor.handoff.confirm.mutationOptions()
  );
  const analyticsTrackMutation = useMutation(
    orpc.advisor.analytics.track.mutationOptions()
  );
  const generationActive =
    turnMutation.isPending || sessionQuery.data?.generationStatus === "RUNNING";

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(
    () => () => {
      for (const attachment of attachmentsRef.current) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      for (const previewUrl of handoffPreviewUrlsRef.current) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    []
  );

  const revokeHandoffPreviews = (): void => {
    for (const previewUrl of handoffPreviewUrlsRef.current) {
      URL.revokeObjectURL(previewUrl);
    }
    handoffPreviewUrlsRef.current = [];
  };

  const loadHandoffAttachmentPreview = async (
    attachmentId: string
  ): Promise<string | undefined> => {
    const response = await fetch(
      `${serverURL}/api/advisor/attachments/${attachmentId}`,
      {
        credentials: "include",
        headers: { "X-Advisor-Visitor-Capability": capability },
      }
    );
    if (!response.ok) {
      return undefined;
    }
    const previewUrl = URL.createObjectURL(await response.blob());
    handoffPreviewUrlsRef.current.push(previewUrl);
    return previewUrl;
  };

  const startSession = async (): Promise<void> => {
    try {
      const consent = await consentMutation.mutateAsync({
        version: "v1",
        visitorCapability: capability,
      });
      const created = await sessionMutation.mutateAsync({
        consentId: consent.consentId,
        visitorCapability: capability,
      });
      setStoredValue(CONSENT_STORAGE_KEY, consent.consentId);
      setStoredValue(SESSION_STORAGE_KEY, created.id);
      setConsentAccepted(true);
      setSessionId(created.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể khởi tạo Advisor."
      );
    }
  };

  const sendTurn = async (
    value: string,
    idempotencyKey: AdvisorIdempotencyKey = crypto.randomUUID(),
    attachmentIds = attachments.map((attachment) => attachment.id)
  ): Promise<void> => {
    const trimmed = value.trim();
    if (
      !trimmed ||
      !sessionId ||
      generationActive ||
      stopMutation.isPending ||
      attachmentBusy
    ) {
      return;
    }
    setRetryRequest(null);
    setText("");
    try {
      await turnMutation.mutateAsync({
        attachmentIds,
        idempotencyKey,
        sessionId,
        text: trimmed,
        visitorCapability: capability,
      });
      for (const attachment of attachments) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      setAttachments([]);
      setAttachmentError(null);
      await queryClient.invalidateQueries({
        queryKey: orpc.advisor.session.get.queryOptions({
          input: { sessionId, visitorCapability: capability },
        }).queryKey,
      });
    } catch (error) {
      setRetryRequest({ attachmentIds, idempotencyKey, text: trimmed });
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể hoàn tất lượt tư vấn."
      );
    }
  };

  const uploadAttachment = async (file: File): Promise<void> => {
    if (!sessionId) {
      throw new Error("Khởi tạo Advisor session trước khi tải ảnh.");
    }
    if (!ADVISOR_ATTACHMENT_CONTENT_TYPES.has(file.type)) {
      throw new Error("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.");
    }
    if (file.size === 0 || file.size > ADVISOR_ATTACHMENT_MAX_BYTES) {
      throw new Error("Ảnh phải có dữ liệu và không vượt quá 10 MB.");
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("sessionId", sessionId);
    formData.set("visitorCapability", capability);
    const response = await fetch(`${serverURL}/api/advisor/attachments`, {
      body: formData,
      credentials: "include",
      method: "POST",
    });
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      throw new Error(getAttachmentErrorMessage(payload));
    }
    if (
      !payload ||
      typeof payload !== "object" ||
      !("attachment" in payload) ||
      !payload.attachment ||
      typeof payload.attachment !== "object"
    ) {
      throw new Error("Phản hồi tải ảnh Advisor không hợp lệ.");
    }
    const attachment = payload.attachment as Omit<
      AdvisorAttachmentPreview,
      "previewUrl"
    >;
    setAttachments((current) => [
      ...current,
      { ...attachment, previewUrl: URL.createObjectURL(file) },
    ]);
  };

  const handleAttachmentFiles = async (
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) {
      return;
    }
    const availableSlots =
      ADVISOR_ATTACHMENT_MAX_PER_MESSAGE - attachments.length;
    if (availableSlots <= 0) {
      setAttachmentError(
        `Mỗi lượt tối đa ${ADVISOR_ATTACHMENT_MAX_PER_MESSAGE} ảnh.`
      );
      return;
    }

    setAttachmentBusy(true);
    setAttachmentError(null);
    const errors: string[] = [];
    try {
      for (const file of files.slice(0, availableSlots)) {
        try {
          await uploadAttachment(file);
        } catch (error) {
          errors.push(
            `${file.name}: ${
              error instanceof Error ? error.message : "Không thể tải ảnh lên."
            }`
          );
        }
      }
      if (files.length > availableSlots) {
        errors.push(`Chỉ có thể thêm ${availableSlots} ảnh nữa cho lượt này.`);
      }
    } finally {
      setAttachmentBusy(false);
    }
    if (errors.length > 0) {
      setAttachmentError(errors.join(" "));
    }
  };

  const removeAttachment = async (
    attachment: AdvisorAttachmentPreview
  ): Promise<void> => {
    setAttachmentBusy(true);
    setAttachmentError(null);
    try {
      const response = await fetch(
        `${serverURL}/api/advisor/attachments/${attachment.id}`,
        {
          credentials: "include",
          headers: { "X-Advisor-Visitor-Capability": capability },
          method: "DELETE",
        }
      );
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok) {
        throw new Error(getAttachmentErrorMessage(payload));
      }
      URL.revokeObjectURL(attachment.previewUrl);
      setAttachments((current) =>
        current.filter((item) => item.id !== attachment.id)
      );
    } catch (error) {
      setAttachmentError(
        error instanceof Error ? error.message : "Không thể xóa ảnh Advisor."
      );
    } finally {
      setAttachmentBusy(false);
    }
  };

  const linkSession = async (): Promise<void> => {
    if (!sessionId) {
      return;
    }
    try {
      await linkMutation.mutateAsync({
        sessionId,
        visitorCapability: capability,
      });
      await queryClient.invalidateQueries({
        queryKey: orpc.advisor.session.get.queryOptions({
          input: { sessionId, visitorCapability: capability },
        }).queryKey,
      });
      toast.success("Đã liên kết Advisor session với tài khoản hiện tại.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể liên kết Advisor session."
      );
    }
  };

  const selectRecommendation = async (
    recommendationId: string,
    listingId: string
  ): Promise<void> => {
    if (!sessionId || selectRecommendationMutation.isPending) {
      return;
    }
    try {
      const selected = await selectRecommendationMutation.mutateAsync({
        recommendationId,
        sessionId,
        visitorCapability: capability,
      });
      revokeHandoffPreviews();
      const handoffAttachments = await Promise.all(
        selected.attachments.map(async (attachment) => ({
          ...attachment,
          previewUrl: await loadHandoffAttachmentPreview(attachment.id),
        }))
      );
      setHandoffSelection({
        attachmentIds: [],
        attachments: handoffAttachments,
        handoffId: selected.handoffId,
        includeSummaryInCheckout: false,
        listingId,
        recommendationId,
        sessionId,
        summary: selected.summary,
      });
      toast.success(
        "Đã tạo Advisory Summary. Hãy kiểm tra trước khi xác nhận."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể chọn recommendation Advisor."
      );
    }
  };

  const confirmHandoff = async (): Promise<void> => {
    if (!handoffSelection) {
      return;
    }
    try {
      const confirmed = await confirmHandoffMutation.mutateAsync({
        attachmentIds: handoffSelection.attachmentIds,
        handoffId: handoffSelection.handoffId,
        includeSummaryInCheckout: handoffSelection.includeSummaryInCheckout,
        sessionId: handoffSelection.sessionId,
        summary: handoffSelection.summary,
        visitorCapability: capability,
      });
      const draft: AdvisorHandoffDraft = {
        attachmentIds: handoffSelection.attachmentIds,
        attachmentsCopied: false,
        handoffId: confirmed.handoffId,
        includeSummaryInCheckout: confirmed.includeSummaryInCheckout,
        listingId: handoffSelection.listingId,
        recommendationId: confirmed.recommendationId,
        sessionId: handoffSelection.sessionId,
        summary: confirmed.summary,
      };
      saveAdvisorHandoffDraft(draft);
      setHandoffSelection((current) =>
        current
          ? {
              ...current,
              summary: confirmed.summary,
            }
          : current
      );
      toast.success(
        "Đã xác nhận ngữ cảnh Advisor. Bạn có thể tự chọn ảnh để đưa vào Checkout."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể xác nhận Advisory Summary."
      );
    }
  };

  const trackAnalytics = async (
    eventType: "CHECKOUT_COMPLETED" | "LISTING_CLICKED" | "SESSION_ABANDONED",
    metadata: { listingId?: string; recommendationId?: string } = {}
  ): Promise<void> => {
    if (!sessionId) {
      return;
    }
    try {
      await analyticsTrackMutation.mutateAsync({
        eventType,
        metadata,
        sessionId,
        visitorCapability: capability,
      });
    } catch {
      // Analytics must never block Advisor interactions.
    }
  };

  const stopTurn = async (): Promise<void> => {
    if (!sessionId) {
      return;
    }
    try {
      await stopMutation.mutateAsync({
        sessionId,
        visitorCapability: capability,
      });
      await queryClient.invalidateQueries({
        queryKey: orpc.advisor.session.get.queryOptions({
          input: { sessionId, visitorCapability: capability },
        }).queryKey,
      });
      toast.success("Đã yêu cầu dừng lượt tư vấn.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể dừng lượt tư vấn."
      );
    }
  };

  const deleteSession = async (): Promise<void> => {
    if (!sessionId) {
      return;
    }
    try {
      await deleteMutation.mutateAsync({
        sessionId,
        visitorCapability: capability,
      });
      removeStoredValue(CONSENT_STORAGE_KEY);
      removeStoredValue(SESSION_STORAGE_KEY);
      for (const attachment of attachments) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      setAttachments([]);
      setAttachmentError(null);
      setSessionId("");
      setConsentAccepted(false);
      setConsentChecked(false);
      setDeleteRequested(false);
      const handoffDraft = getAdvisorHandoffDraft();
      if (
        handoffDraft?.sessionId === sessionId &&
        !handoffDraft.attachmentsCopied
      ) {
        clearAdvisorHandoffDraft();
      }
      revokeHandoffPreviews();
      setHandoffSelection(null);
      toast.success("Advisor session đã được xóa.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể xóa Advisor session."
      );
    }
  };

  const messages = sessionQuery.data?.messages ?? [];
  const recommendations = sessionQuery.data?.recommendations ?? [];
  const latestAssistant = messages
    .toReversed()
    .find((message) => message.role === "ASSISTANT");
  const question = parseQuestion(latestAssistant?.metadata?.question);
  const browsePath = parseBrowsePath(latestAssistant?.metadata?.browsePath);
  const feedbackRecommendation =
    recommendations.find((recommendation) => recommendation.isCurrent) ??
    recommendations[0];
  const feedbackAttachments =
    handoffSelection?.recommendationId === feedbackRecommendation?.id
      ? handoffSelection.attachments
      : [];

  if (!consentAccepted) {
    return (
      <Shell className="min-h-[calc(100vh-12rem)]" variant="default">
        <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center py-8">
          <ConsentPanel
            checked={consentChecked}
            onAccept={() => void startSession()}
            onChange={setConsentChecked}
            pending={consentMutation.isPending || sessionMutation.isPending}
          />
        </div>
      </Shell>
    );
  }

  return (
    <Shell className="min-h-[calc(100vh-12rem)]" variant="default">
      <div className="mx-auto w-full max-w-5xl space-y-5 py-6 sm:py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="font-semibold text-primary text-sm">
              Service Advisor
            </p>
            <h1 className="font-black text-3xl tracking-tight sm:text-4xl">
              Tìm đúng dịch vụ từ nhu cầu của bạn
            </h1>
            <p className="max-w-3xl text-muted-foreground">
              Viết bằng tiếng Việt, English hoặc trộn cả hai. Advisor sẽ hỏi
              từng câu một và chỉ gợi ý các Listing SERVICE đang có thể mua.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={linkMutation.isPending || deleteMutation.isPending}
              onClick={() => void linkSession()}
              size="sm"
              type="button"
              variant="outline"
            >
              Liên kết tài khoản
            </Button>
            <Button
              disabled={linkMutation.isPending || deleteMutation.isPending}
              onClick={() => {
                if (!deleteRequested) {
                  setDeleteRequested(true);
                  return;
                }
                void deleteSession();
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              {deleteRequested ? "Bấm lại để xác nhận xóa" : "Xóa phiên"}
            </Button>
          </div>
        </header>

        {sessionQuery.isError ? (
          <div
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm"
            role="alert"
          >
            Không thể tải phiên Advisor. Hãy tải lại trang để thử lại.
          </div>
        ) : null}

        <Card className="overflow-hidden">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div
              aria-label="Lịch sử hội thoại Advisor"
              aria-live="polite"
              className="max-h-[min(55vh,38rem)] min-h-72 space-y-3 overflow-y-auto rounded-xl bg-muted/20 p-4"
              role="log"
            >
              {messages.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-center text-muted-foreground text-sm">
                  Hãy mô tả một Service Need để bắt đầu.
                </div>
              ) : (
                messages.map((message) => (
                  <ConversationMessage
                    key={message.id}
                    role={message.role}
                    text={message.text}
                  />
                ))
              )}
              {generationActive ? (
                <output className="flex items-center justify-between gap-3 text-muted-foreground text-sm">
                  <span>
                    Advisor đang kiểm tra Playbook và catalog công khai...
                  </span>
                  <Button
                    disabled={stopMutation.isPending}
                    onClick={() => void stopTurn()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {stopMutation.isPending ? "Đang dừng..." : "Dừng"}
                  </Button>
                </output>
              ) : null}
            </div>

            {browsePath ? (
              <a
                className="inline-flex min-h-9 items-center rounded-md border px-3 font-medium text-primary text-sm underline-offset-4 hover:underline"
                href={browsePath}
              >
                {browsePath.startsWith("/listing/")
                  ? "Mở Listing đã kiểm tra"
                  : "Duyệt danh mục liên quan"}
              </a>
            ) : null}

            {question ? (
              <fieldset className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <legend className="px-1 font-semibold text-sm">
                  Câu hỏi tiếp theo
                </legend>
                <p className="text-sm">{question.prompt}</p>
                <div className="flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => void sendTurn(option.label)}
                      type="button"
                      variant="outline"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="space-y-2 rounded-xl border border-dashed bg-muted/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">
                    Ảnh tham khảo (tuỳ chọn)
                  </p>
                  <p className="text-muted-foreground text-xs">
                    JPEG, PNG hoặc WebP · tối đa{" "}
                    {ADVISOR_ATTACHMENT_MAX_PER_MESSAGE} ảnh/lượt,{" "}
                    {ADVISOR_ATTACHMENT_MAX_PER_SESSION} ảnh/session
                  </p>
                </div>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={
                    attachmentBusy || generationActive || stopMutation.isPending
                  }
                  multiple
                  onChange={(event) => void handleAttachmentFiles(event)}
                  ref={attachmentInputRef}
                  type="file"
                />
                <Button
                  disabled={
                    attachmentBusy ||
                    generationActive ||
                    stopMutation.isPending ||
                    attachments.length >= ADVISOR_ATTACHMENT_MAX_PER_MESSAGE
                  }
                  onClick={() => attachmentInputRef.current?.click()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {attachmentBusy ? "Đang xử lý..." : "Thêm ảnh"}
                </Button>
              </div>
              {attachments.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {attachments.map((attachment) => (
                    <li
                      className="group relative overflow-hidden rounded-lg border bg-background"
                      key={attachment.id}
                    >
                      <img
                        alt={`Ảnh tham khảo ${attachment.fileName}`}
                        className="aspect-square w-full object-cover"
                        src={attachment.previewUrl}
                      />
                      <div className="flex items-center justify-between gap-2 p-2">
                        <span className="truncate text-xs">
                          {attachment.fileName}
                        </span>
                        <Button
                          aria-label={`Xóa ảnh ${attachment.fileName}`}
                          disabled={attachmentBusy || generationActive}
                          onClick={() => void removeAttachment(attachment)}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          ×
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {attachmentError ? (
                <p className="text-destructive text-sm" role="alert">
                  {attachmentError}
                </p>
              ) : null}
            </div>

            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void sendTurn(text);
              }}
            >
              <label className="sr-only" htmlFor="advisor-message">
                Mô tả Service Need
              </label>
              <textarea
                aria-label="Mô tả Service Need"
                className="min-h-12 flex-1 resize-y rounded-lg border bg-background px-3 py-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                disabled={generationActive || stopMutation.isPending}
                id="advisor-message"
                onChange={(event) => setText(event.target.value)}
                placeholder="Ví dụ: Tôi cần setup account cho website cá nhân..."
                value={text}
              />
              <Button
                disabled={
                  !text.trim() ||
                  attachmentBusy ||
                  generationActive ||
                  stopMutation.isPending
                }
                type="submit"
              >
                Gửi
              </Button>
            </form>

            {retryRequest ? (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
                role="alert"
              >
                <span>Lượt tư vấn chưa hoàn tất; chưa tạo recommendation.</span>
                <Button
                  onClick={() =>
                    void sendTurn(
                      retryRequest.text,
                      retryRequest.idempotencyKey,
                      retryRequest.attachmentIds
                    )
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Thử lại
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {recommendations.length > 0 ? (
          <section
            aria-labelledby="advisor-recommendations"
            className="space-y-3"
          >
            <h2 className="font-bold text-xl" id="advisor-recommendations">
              Gợi ý từ Advisor
            </h2>
            {recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                onListingClick={(listingId) => {
                  void trackAnalytics("LISTING_CLICKED", {
                    listingId,
                    recommendationId: recommendation.id,
                  });
                }}
                onSelect={(recommendationId, listingId) => {
                  void selectRecommendation(recommendationId, listingId);
                }}
                recommendation={recommendation}
              />
            ))}
          </section>
        ) : null}

        {handoffSelection ? (
          <AdvisorHandoffPanel
            attachments={handoffSelection.attachments}
            attachmentIds={handoffSelection.attachmentIds}
            includeSummaryInCheckout={handoffSelection.includeSummaryInCheckout}
            listingId={handoffSelection.listingId}
            onAttachmentToggle={(attachmentId) => {
              setHandoffSelection((current) => {
                if (!current) {
                  return current;
                }
                const selected = new Set(current.attachmentIds);
                if (selected.has(attachmentId)) {
                  selected.delete(attachmentId);
                } else {
                  selected.add(attachmentId);
                }
                return { ...current, attachmentIds: [...selected] };
              });
            }}
            onIncludeSummaryChange={(includeSummaryInCheckout) => {
              setHandoffSelection((current) =>
                current ? { ...current, includeSummaryInCheckout } : current
              );
            }}
            onListingClick={(listingId) => {
              void trackAnalytics("LISTING_CLICKED", {
                listingId,
                recommendationId: handoffSelection.recommendationId,
              });
            }}
            onListingChange={(nextListingId) => {
              setHandoffSelection((current) =>
                current ? { ...current, listingId: nextListingId } : current
              );
            }}
            onSummaryChange={(summary) => {
              setHandoffSelection((current) =>
                current ? { ...current, summary } : current
              );
            }}
            onConfirm={() => void confirmHandoff()}
            pending={confirmHandoffMutation.isPending}
            recommendation={recommendations.find(
              (recommendation) =>
                recommendation.id === handoffSelection.recommendationId
            )}
            summary={handoffSelection.summary}
          />
        ) : null}

        {feedbackRecommendation ? (
          <AdvisorFeedbackPanel
            attachments={feedbackAttachments}
            onSubmitted={() => {
              toast.success("Đã ghi nhận Advisor Feedback.");
            }}
            recommendationId={feedbackRecommendation.id}
            sessionId={sessionId}
            visitorCapability={capability}
          />
        ) : null}
      </div>
    </Shell>
  );
};
