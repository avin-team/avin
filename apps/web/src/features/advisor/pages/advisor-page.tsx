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
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

const CAPABILITY_STORAGE_KEY = "avin.advisor.capability";
const SESSION_STORAGE_KEY = "avin.advisor.session";
const CONSENT_STORAGE_KEY = "avin.advisor.consent";
const EMPTY_UUID = "00000000-0000-4000-8000-000000000000";
type AdvisorIdempotencyKey =
  `${string}-${string}-${string}-${string}-${string}`;

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
  recommendation,
}: {
  recommendation: {
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
        {recommendation.isCurrent ? (
          <span className="rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground text-xs">
            Gợi ý hiện tại
          </span>
        ) : (
          <span className="rounded-full border px-2.5 py-1 text-muted-foreground text-xs">
            Gợi ý trước đó
          </span>
        )}
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
              href={listing.listingPath}
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

// AVIN-50 keeps consent, generation, retry, and retention controls together so
// the resumable-session state machine remains explicit at the page boundary.
// oxlint-disable-next-line complexity
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
  const [retryRequest, setRetryRequest] = useState<{
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
  const generationActive =
    turnMutation.isPending || sessionQuery.data?.generationStatus === "RUNNING";

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
    idempotencyKey: AdvisorIdempotencyKey = crypto.randomUUID()
  ): Promise<void> => {
    const trimmed = value.trim();
    if (!trimmed || !sessionId || generationActive || stopMutation.isPending) {
      return;
    }
    setRetryRequest(null);
    setText("");
    try {
      await turnMutation.mutateAsync({
        idempotencyKey,
        sessionId,
        text: trimmed,
        visitorCapability: capability,
      });
      await queryClient.invalidateQueries({
        queryKey: orpc.advisor.session.get.queryOptions({
          input: { sessionId, visitorCapability: capability },
        }).queryKey,
      });
    } catch (error) {
      setRetryRequest({ idempotencyKey, text: trimmed });
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể hoàn tất lượt tư vấn."
      );
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
      setSessionId("");
      setConsentAccepted(false);
      setConsentChecked(false);
      setDeleteRequested(false);
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
                  !text.trim() || generationActive || stopMutation.isPending
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
                      retryRequest.idempotencyKey
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
                recommendation={recommendation}
              />
            ))}
          </section>
        ) : null}
      </div>
    </Shell>
  );
};
