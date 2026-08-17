import { ADVISOR_MODEL_ID } from "@avin/api/advisor/provider";
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
import {
  CheckCircleIcon,
  EyeIcon,
  FloppyDiskIcon,
  KeyIcon,
  LockKeyIcon,
  PlayCircleIcon,
  PowerIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import {
  useActivateAdvisorProvider,
  useAdvisorProviderStatus,
  useDisableAdvisorProvider,
  useTestAdvisorProvider,
} from "../api/advisor-provider-api";

const STATUS_COPY = {
  ACTIVE: {
    label: "Đang hoạt động",
    tone: "bg-emerald-600",
  },
  DISABLED: {
    label: "Đã tắt",
    tone: "bg-muted text-muted-foreground",
  },
  INVALID: {
    label: "Không hợp lệ",
    tone: "bg-destructive text-destructive-foreground",
  },
  UNAVAILABLE: {
    label: "Không khả dụng",
    tone: "bg-amber-600",
  },
} as const;

const errorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : "Không thể hoàn tất thao tác cấu hình provider.";

const AdvisorProviderActions = ({
  currentState,
}: {
  currentState: keyof typeof STATUS_COPY;
}) => {
  const testProvider = useTestAdvisorProvider();
  const activateProvider = useActivateAdvisorProvider();
  const disableProvider = useDisableAdvisorProvider();
  const [apiKey, setApiKey] = useState("");
  const [activationError, setActivationError] = useState<string | null>(null);
  const [testedKey, setTestedKey] = useState<string | null>(null);

  const isBusy =
    testProvider.isPending ||
    activateProvider.isPending ||
    disableProvider.isPending;
  const testPassedForCurrentKey =
    testedKey !== null &&
    testedKey === apiKey.trim() &&
    testProvider.data?.contractVerified;

  const handleTest = async (): Promise<void> => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setActivationError("Nhập Groq API key trước khi kiểm tra.");
      toast.error("Nhập Groq API key trước khi kiểm tra.");
      return;
    }

    try {
      setActivationError(null);
      await testProvider.mutateAsync({
        apiKey: trimmedKey,
        model: ADVISOR_MODEL_ID,
      });
      setTestedKey(trimmedKey);
      toast.success("Đã kiểm tra Groq contract. Key chưa được kích hoạt.");
    } catch (error) {
      setTestedKey(null);
      const message = errorMessage(error);
      setActivationError(message);
      toast.error(message);
    }
  };

  const handleActivate = async (
    event?: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event?.preventDefault();
    const trimmedKey = apiKey.trim();
    if (!testPassedForCurrentKey) {
      setActivationError("Hãy kiểm tra key thành công trước khi kích hoạt.");
      toast.error("Hãy kiểm tra key thành công trước khi kích hoạt.");
      return;
    }

    try {
      setActivationError(null);
      await activateProvider.mutateAsync({
        apiKey: trimmedKey,
        model: ADVISOR_MODEL_ID,
      });
      setApiKey("");
      setTestedKey(null);
      toast.success("Đã kích hoạt Service Advisor provider.");
    } catch (error) {
      const message = errorMessage(error);
      setActivationError(message);
      toast.error(message);
    }
  };

  const handleDisable = async (): Promise<void> => {
    try {
      setActivationError(null);
      await disableProvider.mutateAsync({});
      setApiKey("");
      setTestedKey(null);
      toast.success("Đã tắt Service Advisor provider.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <form onSubmit={(event) => void handleActivate(event)}>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="advisor-groq-api-key">
            Groq API key mới
          </label>
          <Input
            autoComplete="new-password"
            id="advisor-groq-api-key"
            onChange={(event) => {
              setApiKey(event.target.value);
              setActivationError(null);
              setTestedKey(null);
            }}
            placeholder="Nhập key để kiểm tra hoặc xoay key"
            type="password"
            value={apiKey}
            aria-describedby="advisor-groq-api-key-help advisor-provider-action-error"
            aria-invalid={Boolean(activationError)}
          />
          <p
            className="text-muted-foreground text-xs"
            id="advisor-groq-api-key-help"
          >
            Key chỉ được gửi qua kết nối bảo mật, kiểm tra trước rồi mới có thể
            kích hoạt.
          </p>
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="advisor-model">
            Model
          </label>
          <select
            className="flex h-9 w-full min-w-56 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            disabled
            id="advisor-model"
            defaultValue={ADVISOR_MODEL_ID}
          >
            <option value={ADVISOR_MODEL_ID}>{ADVISOR_MODEL_ID}</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t bg-muted/20 pt-4">
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isBusy || !apiKey.trim()}
            onClick={() => void handleTest()}
            type="button"
            variant="outline"
          >
            <PlayCircleIcon />
            Kiểm tra key
          </Button>
          <Button disabled={isBusy || !testPassedForCurrentKey} type="submit">
            <FloppyDiskIcon />
            Kích hoạt
          </Button>
        </div>
        <Button
          disabled={isBusy || currentState !== "ACTIVE"}
          onClick={() => void handleDisable()}
          type="button"
          variant="destructive"
        >
          <PowerIcon />
          Tắt provider
        </Button>
      </div>
      {activationError ? (
        <p
          className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm"
          id="advisor-provider-action-error"
          role="alert"
        >
          Cấu hình chưa được kích hoạt: {activationError}
        </p>
      ) : null}
    </form>
  );
};

export const AdvisorProviderSettingsCard = () => {
  const { data: status, isError, isPending } = useAdvisorProviderStatus();
  const currentState = status?.state ?? "DISABLED";
  const stateCopy = STATUS_COPY[currentState];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyIcon className="size-5 text-primary" />
            <CardTitle>Service Advisor provider</CardTitle>
          </div>
          <Badge className={stateCopy.tone}>{stateCopy.label}</Badge>
        </div>
        <CardDescription>
          Cấu hình Groq dùng chung cho Service Advisor. API key chỉ được lưu
          dạng ciphertext trên server và không bao giờ trả về frontend.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isPending ? (
          <p className="text-muted-foreground text-sm">
            Đang tải trạng thái provider…
          </p>
        ) : null}
        {isError ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm">
            <WarningCircleIcon className="size-4" />
            Không thể tải trạng thái provider.
          </div>
        ) : null}

        <dl className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Provider</dt>
            <dd className="font-medium">Groq</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Model allowlist</dt>
            <dd className="font-mono font-medium text-xs">
              {status?.model ?? ADVISOR_MODEL_ID}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">API key</dt>
            <dd className="font-mono font-medium text-xs">
              {status?.keyLastFour
                ? `••••••••${status.keyLastFour}`
                : "Chưa cấu hình"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
            <EyeIcon className="size-3.5" /> Vision model
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
            <LockKeyIcon className="size-3.5" />
            {status?.state === "ACTIVE" && status.zdrVerifiedAt
              ? "ZDR đã xác minh"
              : "ZDR chưa khả dụng"}
          </span>
          {status?.isPreview ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 px-2.5 py-1 text-amber-700 dark:text-amber-300">
              <WarningCircleIcon className="size-3.5" /> Preview model
            </span>
          ) : null}
        </div>

        {status?.lastErrorMessage ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-800 text-sm dark:text-amber-200">
            {status.lastErrorMessage}
          </p>
        ) : null}

        <AdvisorProviderActions currentState={currentState} />
      </CardContent>
      <div className="flex items-center gap-2 border-t px-6 py-3 text-muted-foreground text-xs">
        <CheckCircleIcon className="size-3.5" />
        Admin phải bật 2FA; mọi lần kiểm tra, xoay key và tắt provider đều được
        audit.
      </div>
    </Card>
  );
};
