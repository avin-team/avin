import { Badge } from "@avin/ui/components/badge";
import { Button, buttonVariants } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Textarea } from "@avin/ui/components/textarea";
import { cn } from "@avin/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImageIcon,
  Paperclip,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import {
  clearAdvisorHandoffDraft,
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

type AdvisorTurnFailureKind =
  | "DAILY_QUOTA"
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMIT"
  | "RETRYABLE";

interface AdvisorTurnFailure {
  kind: AdvisorTurnFailureKind;
  message: string;
}

const getErrorCode = (error: unknown): string | null => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
};

const classifyAdvisorTurnFailure = (error: unknown): AdvisorTurnFailure => {
  const code = getErrorCode(error);
  const rawMessage = error instanceof Error ? error.message : "";
  if (code === "TOO_MANY_REQUESTS") {
    if (/quota/iu.test(rawMessage)) {
      return {
        kind: "DAILY_QUOTA",
        message:
          "Advisor đã chạm quota AI trong ngày. Bạn vẫn có thể duyệt danh mục dịch vụ.",
      };
    }
    return {
      kind: "RATE_LIMIT",
      message: rawMessage || "Bạn đang thao tác quá nhanh. Hãy thử lại sau.",
    };
  }
  if (code === "SERVICE_UNAVAILABLE") {
    if (/disabled/iu.test(rawMessage)) {
      return {
        kind: "PROVIDER_UNAVAILABLE",
        message: "Service Advisor đang được Admin tạm tắt.",
      };
    }
    return {
      kind: "PROVIDER_UNAVAILABLE",
      message:
        "Service Advisor hiện không khả dụng do provider hoặc cấu hình. Bạn có thể duyệt danh mục dịch vụ.",
    };
  }
  return {
    kind: "RETRYABLE",
    message: rawMessage || "Không thể hoàn tất lượt tư vấn. Hãy thử lại.",
  };
};

const getAdvisorTurnFailureLabel = (kind: AdvisorTurnFailureKind): string => {
  if (kind === "DAILY_QUOTA") {
    return "Daily quota";
  }
  if (kind === "RATE_LIMIT") {
    return "Rate limit";
  }
  if (kind === "PROVIDER_UNAVAILABLE") {
    return "Advisor unavailable";
  }
  return "Retryable turn failure";
};

const focusOnNextFrame = (element: HTMLElement | null): void => {
  if (!element) {
    return;
  }
  if (
    typeof window !== "undefined" &&
    typeof window.requestAnimationFrame === "function"
  ) {
    window.requestAnimationFrame(() => element.focus());
    return;
  }
  element.focus();
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
  consentRef,
  errorMessage,
  onAccept,
  onChange,
  pending,
}: {
  checked: boolean;
  consentRef: RefObject<HTMLInputElement | null>;
  errorMessage: string | null;
  onAccept: () => void;
  onChange: (checked: boolean) => void;
  pending: boolean;
}) => (
  <Card className="w-full max-w-2xl border-border bg-card shadow-lg">
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Sparkles className="size-5" />
        </div>
        <div>
          <CardTitle className="text-lg">
            Trước khi bắt đầu với Service Advisor
          </CardTitle>
          <CardDescription className="text-xs">
            Trợ lý AI tư vấn và điều phối dịch vụ kỹ thuật
          </CardDescription>
        </div>
      </div>
    </CardHeader>

    <CardContent className="space-y-5 text-sm text-card-foreground">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Service Advisor là AI beta dùng nội dung bạn gửi để gợi ý Listing
        SERVICE phù hợp. Phiên Visitor được giữ tối đa 24 giờ không hoạt động;
        User đã đăng nhập tối đa 30 ngày. Không gửi password, OTP, access token,
        thông tin thanh toán hay giấy tờ định danh.
      </p>

      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground space-y-2">
        <p id="advisor-consent-description">
          Bạn có thể xem đầy đủ tại{" "}
          <Link
            className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
            to="/terms"
          >
            Điều khoản (Terms)
          </Link>{" "}
          và{" "}
          <Link
            className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
            to="/privacy"
          >
            Chính sách bảo mật (Privacy)
          </Link>
          . Advisor chỉ đưa ra gợi ý do AI tạo; Listing detail và package
          selector vẫn là nguồn chính thức để quyết định mua.
        </p>
      </div>

      {errorMessage ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <p>{errorMessage}</p>
          <Link
            className="mt-2 inline-flex font-medium text-primary underline underline-offset-4 hover:opacity-80"
            to="/category"
          >
            Duyệt catalog thủ công
          </Link>
        </div>
      ) : null}

      <label
        className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground cursor-pointer"
        htmlFor="advisor-consent"
      >
        <input
          checked={checked}
          aria-describedby="advisor-consent-description"
          className="mt-0.5 size-4 accent-primary rounded border-border"
          id="advisor-consent"
          onChange={(event) => onChange(event.target.checked)}
          ref={consentRef}
          type="checkbox"
        />
        <span>
          Tôi đã đọc và đồng ý với thông báo xử lý Advisor Consent phiên bản v1.
        </span>
      </label>

      <Button
        disabled={!checked || pending}
        onClick={onAccept}
        className="w-full"
        size="lg"
        type="button"
      >
        <Sparkles className="size-4 mr-1.5" />
        {pending ? "Đang khởi tạo phiên..." : "Bắt đầu tư vấn với AI"}
      </Button>
    </CardContent>
  </Card>
);

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
  const [consentError, setConsentError] = useState<string | null>(null);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<AdvisorAttachmentPreview[]>(
    []
  );
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const attachmentTriggerRef = useRef<HTMLButtonElement>(null);
  const attachmentsRef = useRef<AdvisorAttachmentPreview[]>([]);
  const consentRef = useRef<HTMLInputElement>(null);
  const focusAfterDeleteRef = useRef(false);
  const focusAfterStartRef = useRef(false);
  const handoffHeadingRef = useRef<HTMLHeadingElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [handoffSelection, setHandoffSelection] =
    useState<AdvisorHandoffSelection | null>(null);
  const handoffPreviewUrlsRef = useRef<string[]>([]);
  const [retryRequest, setRetryRequest] = useState<{
    attachmentIds: string[];
    idempotencyKey: AdvisorIdempotencyKey;
    text: string;
  } | null>(null);
  const [turnFailure, setTurnFailure] = useState<AdvisorTurnFailure | null>(
    null
  );
  const [feedbackSentiment, setFeedbackSentiment] = useState<
    "NEGATIVE" | "POSITIVE" | null
  >(null);
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
  const feedbackMutation = useMutation(
    orpc.advisor.feedback.submit.mutationOptions()
  );
  const analyticsTrackMutation = useMutation(
    orpc.advisor.analytics.track.mutationOptions()
  );
  const generationActive =
    turnMutation.isPending || sessionQuery.data?.generationStatus === "RUNNING";

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    if (focusAfterStartRef.current && consentAccepted && sessionQuery.data) {
      focusAfterStartRef.current = false;
      focusOnNextFrame(messageInputRef.current);
    }
  }, [consentAccepted, sessionQuery.data]);

  useEffect(() => {
    if (!focusAfterDeleteRef.current || consentAccepted) {
      return;
    }
    focusAfterDeleteRef.current = false;
    focusOnNextFrame(consentRef.current);
  }, [consentAccepted]);

  useEffect(
    () => () => {
      for (const attachment of attachmentsRef.current) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    },
    []
  );

  useEffect(
    () => () => {
      for (const previewUrl of handoffPreviewUrlsRef.current) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    []
  );

  const startSession = async (): Promise<void> => {
    setConsentError(null);
    try {
      const consent = await consentMutation.mutateAsync({
        version: "v1",
        visitorCapability: capability,
      });
      const created = await sessionMutation.mutateAsync({
        consentId: consent.consentId,
        visitorCapability: capability,
      });
      setStoredValue(CONSENT_STORAGE_KEY, "v1");
      setStoredValue(SESSION_STORAGE_KEY, created.id);
      setSessionId(created.id);
      setConsentAccepted(true);
      focusAfterStartRef.current = true;
      await queryClient.invalidateQueries();
    } catch (error) {
      setConsentError(
        error instanceof Error
          ? error.message
          : "Không thể bắt đầu phiên Advisor. Hãy thử lại."
      );
    }
  };

  const deleteSession = async (): Promise<void> => {
    if (!deleteRequested) {
      setDeleteRequested(true);
      return;
    }
    setDeleteRequested(false);
    if (!sessionId) {
      return;
    }
    try {
      await deleteMutation.mutateAsync({
        sessionId,
        visitorCapability: capability,
      });
      clearAdvisorHandoffDraft();
      removeStoredValue(SESSION_STORAGE_KEY);
      removeStoredValue(CONSENT_STORAGE_KEY);
      setSessionId("");
      setConsentAccepted(false);
      setHandoffSelection(null);
      setText("");
      setAttachments([]);
      setRetryRequest(null);
      setTurnFailure(null);
      focusAfterDeleteRef.current = true;
      await queryClient.invalidateQueries();
      toast.success("Đã xóa phiên Advisor.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa phiên Advisor."
      );
    }
  };

  const linkAccount = async (): Promise<void> => {
    if (!sessionId) {
      return;
    }
    try {
      await linkMutation.mutateAsync({
        sessionId,
        visitorCapability: capability,
      });
      toast.success("Đã liên kết phiên Advisor với tài khoản của bạn.");
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Chỉ người dùng đã đăng nhập mới có thể liên kết phiên."
      );
    }
  };

  const trackAnalytics = async (
    eventType:
      | "ATTACHMENT_ADDED"
      | "CHECKOUT_COMPLETED"
      | "FEEDBACK_SUBMITTED"
      | "LISTING_CLICKED"
      | "RECOMMENDATION_SELECTED"
      | "SUMMARY_CONFIRMED",
    metadata?: Record<string, unknown>
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
      // Analytics failures must not break user interaction.
    }
  };

  const uploadAttachment = async (
    file: File
  ): Promise<AdvisorAttachmentPreview> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("visitorCapability", capability);
    formData.append("sessionId", sessionId);

    const response = await fetch(`${serverURL}/api/advisor/attachments`, {
      body: formData,
      credentials: "include",
      method: "POST",
    });

    const payload = (await response.json()) as unknown;
    if (!response.ok) {
      throw new Error(getAttachmentErrorMessage(payload));
    }

    const previewUrl = URL.createObjectURL(file);
    const candidate = payload as Partial<AdvisorAttachmentPreview>;
    return {
      byteSize: candidate.byteSize ?? file.size,
      contentType: candidate.contentType ?? file.type,
      expiresAt: candidate.expiresAt ?? new Date().toISOString(),
      fileName: candidate.fileName ?? file.name,
      height: candidate.height ?? 0,
      id: candidate.id ?? "",
      previewUrl,
      width: candidate.width ?? 0,
    };
  };

  const handleAttachmentFiles = async (
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }
    setAttachmentError(null);
    const files = [...fileList];

    if (
      attachments.length + files.length >
      ADVISOR_ATTACHMENT_MAX_PER_MESSAGE
    ) {
      setAttachmentError(
        `Chỉ được gửi tối đa ${ADVISOR_ATTACHMENT_MAX_PER_MESSAGE} ảnh trong mỗi tin nhắn.`
      );
      event.target.value = "";
      return;
    }

    for (const file of files) {
      if (!ADVISOR_ATTACHMENT_CONTENT_TYPES.has(file.type)) {
        setAttachmentError("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
        event.target.value = "";
        return;
      }
      if (file.size > ADVISOR_ATTACHMENT_MAX_BYTES) {
        setAttachmentError("Mỗi ảnh không được vượt quá 10MB.");
        event.target.value = "";
        return;
      }
    }

    setAttachmentBusy(true);
    const uploaded: AdvisorAttachmentPreview[] = [];
    try {
      for (const file of files) {
        // oxlint-disable-next-line no-await-in-loop
        const preview = await uploadAttachment(file);
        uploaded.push(preview);
      }
      setAttachments((current) => [...current, ...uploaded]);
      void trackAnalytics("ATTACHMENT_ADDED", { count: uploaded.length });
    } catch (error) {
      for (const item of uploaded) {
        URL.revokeObjectURL(item.previewUrl);
      }
      setAttachmentError(
        error instanceof Error
          ? error.message
          : "Không thể upload ảnh đính kèm."
      );
    } finally {
      setAttachmentBusy(false);
      event.target.value = "";
    }
  };

  const removeAttachment = (attachment: AdvisorAttachmentPreview): void => {
    URL.revokeObjectURL(attachment.previewUrl);
    setAttachments((current) =>
      current.filter((item) => item.id !== attachment.id)
    );
  };

  const sendTurn = async (
    messageText: string,
    retryKey?: AdvisorIdempotencyKey,
    attachmentIdsOverride?: string[]
  ): Promise<void> => {
    const trimmed = messageText.trim();
    if (!trimmed || !sessionId) {
      return;
    }

    const idempotencyKey: AdvisorIdempotencyKey =
      retryKey ??
      (`${globalThis.crypto?.randomUUID?.() ?? "00000000-0000-4000-8000-000000000000"}` as AdvisorIdempotencyKey);
    const attachmentIds =
      attachmentIdsOverride ?? attachments.map((item) => item.id);

    setTurnFailure(null);
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

      for (const item of attachments) {
        URL.revokeObjectURL(item.previewUrl);
      }
      setAttachments([]);
      await queryClient.invalidateQueries();
    } catch (error) {
      const failure = classifyAdvisorTurnFailure(error);
      setTurnFailure(failure);
      if (failure.kind === "RETRYABLE") {
        setRetryRequest({
          attachmentIds,
          idempotencyKey,
          text: trimmed,
        });
      }
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
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể dừng lượt tư vấn."
      );
    }
  };

  const selectRecommendation = async (
    recommendationId: string,
    listingId: string
  ): Promise<void> => {
    if (!sessionId) {
      return;
    }
    try {
      const result = await selectRecommendationMutation.mutateAsync({
        recommendationId,
        sessionId,
        visitorCapability: capability,
      });

      const convertedAttachments: AdvisorHandoffAttachment[] =
        result.attachments.map((att) => ({
          byteSize: att.byteSize,
          contentType: att.contentType,
          fileName: att.fileName,
          height: att.height,
          id: att.id,
          previewUrl: undefined,
          width: att.width,
        }));

      setHandoffSelection({
        attachmentIds: result.attachments.map((a) => a.id),
        attachments: convertedAttachments,
        handoffId: result.handoffId,
        includeSummaryInCheckout: true,
        listingId,
        recommendationId: result.recommendationId,
        sessionId,
        summary: result.summary,
      });

      focusOnNextFrame(handoffHeadingRef.current);
      void trackAnalytics("RECOMMENDATION_SELECTED", {
        listingId,
        recommendationId,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể chọn recommendation."
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
        attachmentIds: confirmed.attachments.map((a) => a.id),
        attachmentsCopied: false,
        handoffId: confirmed.handoffId,
        includeSummaryInCheckout: confirmed.includeSummaryInCheckout,
        listingId: handoffSelection.listingId,
        recommendationId: confirmed.recommendationId,
        sessionId: handoffSelection.sessionId,
        summary: confirmed.summary,
      };

      saveAdvisorHandoffDraft(draft);
      toast.success(
        "Đã lưu tóm tắt Advisor! Bạn có thể chuyển sang trang Listing để đặt dịch vụ."
      );
      void trackAnalytics("SUMMARY_CONFIRMED", {
        listingId: handoffSelection.listingId,
        recommendationId: confirmed.recommendationId,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể xác nhận ngữ cảnh Advisor."
      );
    }
  };

  const submitFeedback = async (
    recommendationId: string,
    sentiment: "NEGATIVE" | "POSITIVE"
  ): Promise<void> => {
    try {
      await feedbackMutation.mutateAsync({
        attachmentIds: [],
        attachmentsConsent: false,
        includeConversation: false,
        recommendationId,
        sentiment,
        sessionId,
        visitorCapability: capability,
      });
      setFeedbackSentiment(sentiment);
      toast.success("Cảm ơn bạn đã gửi đánh giá cho Advisor!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể gửi Advisor Feedback."
      );
    }
  };

  const messages = sessionQuery.data?.messages ?? [];
  const recommendations = sessionQuery.data?.recommendations ?? [];

  const lastAssistantMessage = messages.findLast((m) => m.role === "ASSISTANT");

  const question = parseQuestion(
    lastAssistantMessage?.metadata &&
      typeof lastAssistantMessage.metadata === "object" &&
      "question" in lastAssistantMessage.metadata
      ? lastAssistantMessage.metadata.question
      : null
  );

  const browsePath = parseBrowsePath(
    lastAssistantMessage?.metadata &&
      typeof lastAssistantMessage.metadata === "object" &&
      "browsePath" in lastAssistantMessage.metadata
      ? lastAssistantMessage.metadata.browsePath
      : null
  );

  if (!consentAccepted) {
    return (
      <Shell variant="centered" className="p-4">
        <ConsentPanel
          checked={consentChecked}
          consentRef={consentRef}
          errorMessage={consentError}
          onAccept={() => void startSession()}
          onChange={setConsentChecked}
          pending={consentMutation.isPending || sessionMutation.isPending}
        />
      </Shell>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* App-Theme Unified Header Bar */}
      <header className="sticky top-16 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm text-foreground sm:text-base">
                Service Advisor
              </h1>
              <Badge
                variant="secondary"
                className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20"
              >
                AI Beta
              </Badge>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Tự động đối soát Playbook & gợi ý dịch vụ kỹ thuật chính xác
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void linkAccount()}
            className="gap-1.5"
          >
            <UserCheck className="size-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Liên kết tài khoản</span>
          </Button>

          <Button
            type="button"
            variant={deleteRequested ? "destructive" : "outline"}
            size="sm"
            aria-label={
              deleteRequested ? "Bấm lại để xác nhận xóa" : "Xóa phiên"
            }
            onClick={() => void deleteSession()}
            className="gap-1.5"
          >
            <Trash2 className="size-3.5" />
            <span>{deleteRequested ? "Xác nhận xóa" : "Xóa phiên"}</span>
          </Button>
        </div>
      </header>

      {/* Main Centered Stream Area */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6 pb-48 sm:px-6">
        {sessionQuery.isError ? (
          <div
            className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm"
            role="alert"
          >
            Không thể tải phiên Advisor. Hãy tải lại trang để thử lại.
          </div>
        ) : null}

        {/* Conversation Stream */}
        <div
          aria-busy={generationActive}
          aria-label="Lịch sử hội thoại Advisor"
          aria-live="polite"
          className="space-y-6"
          role="log"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Sparkles className="size-6" />
              </div>
              <h2 className="font-semibold text-base text-foreground">
                Bạn đang gặp vấn đề hay cần tìm dịch vụ gì?
              </h2>
              <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                Mô tả chi tiết sự cố (kèm ảnh chụp màn hình lỗi nếu có). Advisor
                sẽ tự động đối soát kho Playbook để chọn đúng gói dịch vụ và
                Seller uy tín nhất.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="space-y-3">
                {message.role === "USER" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tr-sm bg-secondary text-secondary-foreground px-4 py-3 text-sm shadow-sm ring-1 ring-border/50 leading-relaxed">
                      <p className="whitespace-pre-wrap">{message.text}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                      <Sparkles className="size-4" />
                    </div>

                    <div className="flex-1 space-y-4 text-sm">
                      {/* Assistant Text Bubble */}
                      <div className="rounded-2xl rounded-tl-sm border border-border bg-card text-card-foreground p-4 text-sm shadow-sm leading-relaxed whitespace-pre-wrap">
                        {message.text}
                      </div>

                      {/* Browse Path Link */}
                      {browsePath ? (
                        <a
                          href={browsePath}
                          className={cn(
                            buttonVariants({ size: "sm", variant: "outline" }),
                            "hover:border-primary hover:text-primary w-fit inline-flex"
                          )}
                        >
                          {browsePath.startsWith("/listing/")
                            ? "Mở Listing đã kiểm tra"
                            : "Duyệt danh mục liên quan"}
                          <ArrowRight className="size-3 ml-1" />
                        </a>
                      ) : null}

                      {/* Question Options */}
                      {question ? (
                        <div className="space-y-2 rounded-2xl border border-border bg-muted/40 p-4">
                          <p className="font-medium text-xs text-foreground">
                            {question.prompt}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {question.options.map((option) => (
                              <Button
                                key={option.value}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void sendTurn(option.label)}
                                className="rounded-xl border-border bg-card text-xs text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary transition-all active:scale-98"
                              >
                                {option.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Inlined Recommendations (Matching this turn) */}
                      {recommendations.length > 0 ? (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                              Dịch vụ đề xuất từ Advisor (
                              {recommendations.length})
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-xs text-primary font-mono"
                            >
                              Khớp danh mục
                            </Badge>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            {recommendations.flatMap((recommendation) =>
                              recommendation.listings.map((listing) => (
                                <div
                                  key={listing.id}
                                  className="flex flex-col justify-between rounded-2xl border border-border bg-card text-card-foreground p-4 shadow-sm transition-all hover:border-primary/50"
                                >
                                  <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] font-medium"
                                      >
                                        {listing.seller.name}
                                      </Badge>
                                      <div className="flex items-center gap-1 text-amber-500 text-xs">
                                        <Star className="size-3 fill-amber-500" />
                                        <span className="font-semibold">
                                          {listing.ratingScore.toFixed(1)}
                                        </span>
                                        <span className="text-muted-foreground text-[10px]">
                                          ({listing.completedOrderCount} đơn)
                                        </span>
                                      </div>
                                    </div>

                                    <h4 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
                                      {listing.title}
                                    </h4>

                                    {/* Price & Package Info */}
                                    <div className="space-y-1.5 rounded-xl bg-muted/60 p-2.5 border border-border/70">
                                      <div className="flex items-baseline justify-between">
                                        <span className="text-[11px] text-muted-foreground">
                                          {listing.servicePackage
                                            ? `Gói: ${listing.servicePackage.name}`
                                            : "Giá khởi điểm"}
                                        </span>
                                        <span className="font-bold text-sm text-primary">
                                          {formatVND(
                                            listing.servicePackage
                                              ?.priceAmount ??
                                              listing.priceAmount
                                          )}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                                        {listing.processingTimeHours ? (
                                          <span className="flex items-center gap-1">
                                            <Clock className="size-3 text-muted-foreground" />
                                            {listing.processingTimeHours}h
                                          </span>
                                        ) : null}
                                        <span className="flex items-center gap-1">
                                          <ShieldCheck className="size-3 text-primary" />
                                          {formatWarranty(
                                            listing.warrantyPolicy
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Reasons */}
                                    {listing.reasons &&
                                    listing.reasons.length > 0 ? (
                                      <ul className="space-y-1 text-[11px] text-muted-foreground">
                                        {listing.reasons
                                          .slice(0, 2)
                                          .map((r) => (
                                            <li
                                              key={r}
                                              className="flex items-start gap-1.5"
                                            >
                                              <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-primary" />
                                              <span className="line-clamp-1">
                                                {r}
                                              </span>
                                            </li>
                                          ))}
                                      </ul>
                                    ) : null}
                                  </div>

                                  <div className="mt-4 flex flex-col gap-2 pt-2 border-t border-border/60">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() =>
                                        void selectRecommendation(
                                          recommendation.id,
                                          listing.id
                                        )
                                      }
                                      className="w-full gap-1.5"
                                    >
                                      <Share2 className="size-3.5" />
                                      Tạo tóm tắt cho Checkout
                                    </Button>

                                    <a
                                      href={getListingPathWithAdvisorPackage(
                                        listing.listingPath,
                                        listing.servicePackage?.id ?? null
                                      )}
                                      onClick={() => {
                                        void trackAnalytics("LISTING_CLICKED", {
                                          listingId: listing.id,
                                          recommendationId: recommendation.id,
                                        });
                                      }}
                                      className={cn(
                                        buttonVariants({
                                          size: "sm",
                                          variant: "ghost",
                                        }),
                                        "w-full text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center justify-center"
                                      )}
                                    >
                                      Xem chi tiết Listing
                                      <ExternalLink className="size-3 ml-1" />
                                    </a>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}

                      {/* Inlined Handoff Selection Card */}
                      {handoffSelection ? (
                        <div
                          ref={handoffHeadingRef}
                          tabIndex={-1}
                          className="rounded-2xl border border-primary/40 bg-card text-card-foreground p-4 shadow-md space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Share2 className="size-4 text-primary" />
                              <h3 className="font-semibold text-xs text-foreground">
                                Ngữ cảnh chuyển giao vào Buyer Checkout Note
                              </h3>
                            </div>
                            <span className="text-[10px] text-primary font-mono">
                              Tùy chỉnh trước khi lưu
                            </span>
                          </div>

                          <label
                            className="grid gap-1.5 text-xs text-muted-foreground"
                            htmlFor="handoff-summary-text"
                          >
                            Tóm tắt sự cố:
                            <Textarea
                              id="handoff-summary-text"
                              value={handoffSelection.summary}
                              onChange={(e) =>
                                setHandoffSelection((curr) =>
                                  curr
                                    ? { ...curr, summary: e.target.value }
                                    : curr
                                )
                              }
                              rows={3}
                              className="rounded-xl border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus-visible:ring-primary"
                            />
                          </label>

                          <label
                            className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"
                            htmlFor="handoff-inc-chk"
                          >
                            <input
                              id="handoff-inc-chk"
                              type="checkbox"
                              checked={
                                handoffSelection.includeSummaryInCheckout
                              }
                              onChange={(e) =>
                                setHandoffSelection((curr) =>
                                  curr
                                    ? {
                                        ...curr,
                                        includeSummaryInCheckout:
                                          e.target.checked,
                                      }
                                    : curr
                                )
                              }
                              className="size-3.5 rounded border-border accent-primary"
                            />
                            Tự động đưa tóm tắt này vào Buyer Checkout Note khi
                            thanh toán
                          </label>

                          <Button
                            type="button"
                            disabled={
                              confirmHandoffMutation.isPending ||
                              !handoffSelection.summary.trim()
                            }
                            onClick={() => void confirmHandoff()}
                            className="w-full gap-2"
                            size="sm"
                          >
                            <CheckCircle2 className="size-4" />
                            {confirmHandoffMutation.isPending
                              ? "Đang lưu..."
                              : "Xác nhận ngữ cảnh Advisor"}
                          </Button>
                        </div>
                      ) : null}

                      {/* Inlined Feedback */}
                      {recommendations[0] ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/80 text-xs text-muted-foreground">
                          <span>Đánh giá kết quả gợi ý:</span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                feedbackSentiment === "POSITIVE"
                                  ? "secondary"
                                  : "outline"
                              }
                              aria-label="Đánh giá hữu ích"
                              onClick={() => {
                                const [rec] = recommendations;
                                if (rec) {
                                  void submitFeedback(rec.id, "POSITIVE");
                                }
                              }}
                              className={`gap-1 ${
                                feedbackSentiment === "POSITIVE"
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <ThumbsUp className="size-3" />
                              <span>Hữu ích</span>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                feedbackSentiment === "NEGATIVE"
                                  ? "secondary"
                                  : "outline"
                              }
                              aria-label="Đánh giá chưa phù hợp"
                              onClick={() => {
                                const [rec] = recommendations;
                                if (rec) {
                                  void submitFeedback(rec.id, "NEGATIVE");
                                }
                              }}
                              className={`gap-1 ${
                                feedbackSentiment === "NEGATIVE"
                                  ? "border-destructive bg-destructive/10 text-destructive"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <ThumbsDown className="size-3" />
                              <span>Chưa phù hợp</span>
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Active Generation Indicator */}
          {generationActive ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 animate-spin text-primary" />
                <span className="animate-pulse">
                  Advisor đang phân tích Playbook và catalog dịch vụ...
                </span>
              </div>
              <Button
                disabled={stopMutation.isPending}
                onClick={() => void stopTurn()}
                size="sm"
                type="button"
                variant="outline"
              >
                {stopMutation.isPending ? "Đang dừng..." : "Dừng"}
              </Button>
            </div>
          ) : null}

          {/* Failure Alert */}
          {turnFailure ? (
            <div
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-1.5"
              role="alert"
            >
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="size-4" />
                <span>{getAdvisorTurnFailureLabel(turnFailure.kind)}</span>
              </div>
              <p>{turnFailure.message}</p>
              {turnFailure.kind === "DAILY_QUOTA" ||
              turnFailure.kind === "PROVIDER_UNAVAILABLE" ? (
                <Link
                  className="inline-flex font-medium text-primary underline underline-offset-4 hover:opacity-80"
                  to="/category"
                >
                  Duyệt catalog thủ công
                </Link>
              ) : null}
            </div>
          ) : null}

          {/* Retry Request Action */}
          {retryRequest ? (
            <div
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground"
              role="alert"
            >
              <span>Lượt tư vấn chưa hoàn tất; chưa tạo recommendation.</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void sendTurn(
                    retryRequest.text,
                    retryRequest.idempotencyKey,
                    retryRequest.attachmentIds
                  )
                }
              >
                Thử lại
              </Button>
            </div>
          ) : null}
        </div>
      </main>

      {/* Fixed Bottom Floating Composer Dock */}
      <footer className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 pb-6 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Attachment Preview Tray */}
          {attachments.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground shadow-sm"
                >
                  <ImageIcon className="size-3.5 text-primary" />
                  <span className="max-w-40 truncate">
                    {attachment.fileName}
                  </span>
                  <button
                    type="button"
                    aria-label={`Xóa ảnh ${attachment.fileName}`}
                    disabled={attachmentBusy || generationActive}
                    onClick={() => removeAttachment(attachment)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {attachmentError ? (
            <p className="mb-2 text-xs text-destructive" role="alert">
              {attachmentError}
            </p>
          ) : null}

          {/* Hidden File Input */}
          <input
            accept="image/jpeg,image/png,image/webp"
            aria-label="Chọn ảnh tham khảo"
            className="sr-only"
            disabled={
              attachmentBusy || generationActive || stopMutation.isPending
            }
            multiple
            onChange={(event) => void handleAttachmentFiles(event)}
            ref={attachmentInputRef}
            type="file"
          />

          {/* Unified Composer Container */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendTurn(text);
            }}
            className="relative flex items-end gap-2 rounded-2xl border border-border bg-card/95 p-2.5 shadow-2xl backdrop-blur-xl focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Đính kèm ảnh lỗi (Tối đa 3 ảnh)"
              disabled={
                attachmentBusy ||
                generationActive ||
                stopMutation.isPending ||
                attachments.length >= ADVISOR_ATTACHMENT_MAX_PER_MESSAGE
              }
              onClick={() => attachmentInputRef.current?.click()}
              ref={attachmentTriggerRef}
              className="text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="size-4" />
            </Button>

            <textarea
              aria-label="Mô tả Service Need"
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              disabled={generationActive || stopMutation.isPending}
              id="advisor-message"
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendTurn(text);
                }
              }}
              placeholder="Ví dụ: Tôi cần mở khóa Facebook checkpoint 282 trong 24h..."
              ref={messageInputRef}
              rows={1}
              value={text}
            />

            <Button
              type="submit"
              size="icon"
              aria-label="Gửi yêu cầu"
              disabled={
                !text.trim() ||
                attachmentBusy ||
                generationActive ||
                stopMutation.isPending
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
};
