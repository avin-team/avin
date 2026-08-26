import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import {
  useAdminProtectionPolicies,
  usePublishAdminProtectionPolicy,
} from "../api/policy-api";
import type { AdminProtectionPolicy } from "../api/policy-api";

interface PolicyFormState {
  bronzeMinimumBondAmount: string;
  diamondMinimumBondAmount: string;
  changedAreas: string;
  effectiveAt: string;
  materialChange: boolean;
  membershipFeeAmount: string;
  minimumBondAmount: string;
  goldMinimumBondAmount: string;
  recommendedLimitPercentage: string;
  recommendedLimitRounding: string;
  rationale: string;
  reacceptDeadlineAt: string;
  retentionPolicyReference: string;
  summary: string;
  silverMinimumBondAmount: string;
  terms: string;
  title: string;
  vipMinimumBondAmount: string;
  version: string;
}

const toLocalDateTime = (value: Date): string => {
  const timezoneOffset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const createInitialForm = (): PolicyFormState => {
  const effectiveAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const deadline = new Date(effectiveAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    bronzeMinimumBondAmount: "5000000",
    changedAreas: "",
    diamondMinimumBondAmount: "50000000",
    effectiveAt: toLocalDateTime(effectiveAt),
    goldMinimumBondAmount: "20000000",
    materialChange: true,
    membershipFeeAmount: "0",
    minimumBondAmount: "1000000",
    rationale: "",
    reacceptDeadlineAt: toLocalDateTime(deadline),
    recommendedLimitPercentage: "80",
    recommendedLimitRounding: "100000",
    retentionPolicyReference: "LEGAL_DATA_GOVERNANCE_APPROVAL_REQUIRED",
    silverMinimumBondAmount: "10000000",
    summary: "",
    terms: "",
    title: "",
    version: "",
    vipMinimumBondAmount: "100000000",
  };
};

const formatDate = (value: string): string =>
  new Date(value).toLocaleString("vi-VN");

const PolicyCard = ({ policy }: { policy: AdminProtectionPolicy }) => (
  <Card>
    <CardHeader>
      <CardTitle>
        {policy.title} · {policy.version}
      </CardTitle>
      <CardDescription>
        Hiệu lực {formatDate(policy.effectiveAt)} · phát hành{" "}
        {formatDate(policy.publishedAt)}
      </CardDescription>
    </CardHeader>
    <CardContent className="grid gap-4 text-sm">
      <p>{policy.summary}</p>
      <div className="rounded-xl border bg-muted/20 p-3 text-sm">
        <p className="font-medium">Hạng đối tác</p>
        <p className="text-muted-foreground">
          Đồng {policy.bronzeMinimumBondAmount.toLocaleString("vi-VN")} · Bạc{" "}
          {policy.silverMinimumBondAmount.toLocaleString("vi-VN")} · Vàng{" "}
          {policy.goldMinimumBondAmount.toLocaleString("vi-VN")} · Kim cương{" "}
          {policy.diamondMinimumBondAmount.toLocaleString("vi-VN")} · VIP{" "}
          {policy.vipMinimumBondAmount.toLocaleString("vi-VN")}
        </p>
        <p className="mt-1 text-muted-foreground">
          Hạn mức khuyến nghị ≤ {policy.recommendedLimitPercentage}% Bond, làm
          tròn {policy.recommendedLimitRounding.toLocaleString("vi-VN")} VND.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-medium">Material change</p>
          <p className="text-muted-foreground">
            {policy.materialChange ? "Có" : "Không"}
          </p>
        </div>
        <div>
          <p className="font-medium">Minimum Bond</p>
          <p className="text-muted-foreground">
            {policy.minimumBondAmount.toLocaleString("vi-VN")} VND
          </p>
        </div>
        <div>
          <p className="font-medium">Membership Fee</p>
          <p className="text-muted-foreground">
            {policy.membershipFeeAmount.toLocaleString("vi-VN")} VND
          </p>
        </div>
        <div>
          <p className="font-medium">Hạn reaccept</p>
          <p className="text-muted-foreground">
            {policy.reacceptDeadlineAt
              ? formatDate(policy.reacceptDeadlineAt)
              : "Không áp dụng"}
          </p>
        </div>
      </div>
      <p className="text-muted-foreground">
        Retention reference: {policy.retentionPolicyReference}
      </p>
      <details className="rounded-xl border bg-muted/20 p-4">
        <summary className="cursor-pointer font-medium">Điều khoản</summary>
        <p className="mt-3 whitespace-pre-wrap text-muted-foreground">
          {policy.terms}
        </p>
      </details>
    </CardContent>
  </Card>
);

export const ProtectionPolicyPage = () => {
  const policiesQuery = useAdminProtectionPolicies();
  const publish = usePublishAdminProtectionPolicy();
  const [form, setForm] = useState(createInitialForm);

  const update = <K extends keyof PolicyFormState>(
    field: K,
    value: PolicyFormState[K]
  ): void => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (): Promise<void> => {
    const changedAreas = form.changedAreas
      .split(",")
      .map((area) => area.trim())
      .filter(Boolean);
    if (
      !form.version.trim() ||
      !form.title.trim() ||
      !form.summary.trim() ||
      !form.terms.trim() ||
      !form.rationale.trim() ||
      changedAreas.length === 0
    ) {
      toast.error("Cần nhập đầy đủ version, nội dung và vùng thay đổi.");
      return;
    }
    try {
      await publish.mutateAsync({
        bronzeMinimumBondAmount: Number(form.bronzeMinimumBondAmount),
        diamondMinimumBondAmount: Number(form.diamondMinimumBondAmount),
        effectiveAt: form.effectiveAt,
        goldMinimumBondAmount: Number(form.goldMinimumBondAmount),
        materialChange: form.materialChange,
        materialChangeMetadata: {
          changedAreas,
          rationale: form.rationale.trim(),
        },
        membershipFeeAmount: 0,
        minimumBondAmount: Number(form.minimumBondAmount),
        reacceptDeadlineAt: form.materialChange
          ? form.reacceptDeadlineAt
          : null,
        recommendedLimitPercentage: Number(form.recommendedLimitPercentage),
        recommendedLimitRounding: Number(form.recommendedLimitRounding),
        retentionPolicyReference: form.retentionPolicyReference.trim(),
        silverMinimumBondAmount: Number(form.silverMinimumBondAmount),
        summary: form.summary.trim(),
        terms: form.terms.trim(),
        title: form.title.trim(),
        version: form.version.trim(),
        vipMinimumBondAmount: Number(form.vipMinimumBondAmount),
      });
      toast.success("Đã phát hành policy version bất biến.");
      setForm(createInitialForm());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể phát hành policy."
      );
    }
  };

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="font-medium text-primary text-sm">
            AVIN CHECK · POLICY
          </p>
          <h1 className="mt-1 font-semibold text-3xl tracking-tight">
            Policy version và reacceptance
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Policy version đã phát hành là bất biến. Mọi material change phải có
            deadline reaccept; retention chỉ tham chiếu quyết định data
            governance.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Phát hành policy version</CardTitle>
            <CardDescription>
              Chỉ SUPER_ADMIN có capability phù hợp mới có thể phát hành.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm" htmlFor="policy-version">
                <span className="font-medium">Version</span>
                <Input
                  id="policy-version"
                  onChange={(event) => update("version", event.target.value)}
                  value={form.version}
                />
              </label>
              <label className="grid gap-2 text-sm" htmlFor="policy-title">
                <span className="font-medium">Title</span>
                <Input
                  id="policy-title"
                  onChange={(event) => update("title", event.target.value)}
                  value={form.title}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm" htmlFor="policy-summary">
              <span className="font-medium">Summary</span>
              <Textarea
                id="policy-summary"
                onChange={(event) => update("summary", event.target.value)}
                value={form.summary}
              />
            </label>
            <label className="grid gap-2 text-sm" htmlFor="policy-terms">
              <span className="font-medium">Terms</span>
              <Textarea
                id="policy-terms"
                onChange={(event) => update("terms", event.target.value)}
                rows={7}
                value={form.terms}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm" htmlFor="policy-effective">
                <span className="font-medium">Effective at</span>
                <Input
                  id="policy-effective"
                  onChange={(event) =>
                    update("effectiveAt", event.target.value)
                  }
                  type="datetime-local"
                  value={form.effectiveAt}
                />
              </label>
              <label className="grid gap-2 text-sm" htmlFor="policy-deadline">
                <span className="font-medium">Reaccept deadline</span>
                <Input
                  disabled={!form.materialChange}
                  id="policy-deadline"
                  onChange={(event) =>
                    update("reacceptDeadlineAt", event.target.value)
                  }
                  type="datetime-local"
                  value={form.reacceptDeadlineAt}
                />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input
                checked={form.materialChange}
                onChange={(event) =>
                  update("materialChange", event.target.checked)
                }
                type="checkbox"
              />
              <span className="font-medium">Đây là material change</span>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm" htmlFor="policy-areas">
                <span className="font-medium">
                  Changed areas (phân cách bằng dấu phẩy)
                </span>
                <Input
                  id="policy-areas"
                  onChange={(event) =>
                    update("changedAreas", event.target.value)
                  }
                  value={form.changedAreas}
                />
              </label>
              <label className="grid gap-2 text-sm" htmlFor="policy-rationale">
                <span className="font-medium">Material-change rationale</span>
                <Input
                  id="policy-rationale"
                  onChange={(event) => update("rationale", event.target.value)}
                  value={form.rationale}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm" htmlFor="policy-bond">
                <span className="font-medium">Minimum Bond (VND)</span>
                <Input
                  id="policy-bond"
                  inputMode="numeric"
                  onChange={(event) =>
                    update("minimumBondAmount", event.target.value)
                  }
                  value={form.minimumBondAmount}
                />
              </label>
              <label className="grid gap-2 text-sm" htmlFor="policy-fee">
                <span className="font-medium">Membership Fee (VND)</span>
                <Input
                  disabled
                  id="policy-fee"
                  value={form.membershipFeeAmount}
                />
                <span className="text-muted-foreground text-xs">
                  P0 cố định 0 VND; muốn bật phí phải có policy/luồng hoàn tiền
                  riêng.
                </span>
              </label>
              <label className="grid gap-2 text-sm" htmlFor="policy-retention">
                <span className="font-medium">Retention policy reference</span>
                <Input
                  id="policy-retention"
                  onChange={(event) =>
                    update("retentionPolicyReference", event.target.value)
                  }
                  value={form.retentionPolicyReference}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["bronzeMinimumBondAmount", "Đồng từ (VND)"],
                  ["silverMinimumBondAmount", "Bạc từ (VND)"],
                  ["goldMinimumBondAmount", "Vàng từ (VND)"],
                  ["diamondMinimumBondAmount", "Kim cương từ (VND)"],
                  ["vipMinimumBondAmount", "VIP từ (VND)"],
                  ["recommendedLimitPercentage", "% hạn mức khuyến nghị"],
                  ["recommendedLimitRounding", "Đơn vị làm tròn (VND)"],
                ] as const
              ).map(([field, label]) => (
                <label
                  className="grid gap-2 text-sm"
                  htmlFor={`policy-${field}`}
                  key={field}
                >
                  <span className="font-medium">{label}</span>
                  <Input
                    id={`policy-${field}`}
                    inputMode="numeric"
                    onChange={(event) => update(field, event.target.value)}
                    value={form[field]}
                  />
                </label>
              ))}
            </div>
            <Button
              className="w-fit"
              disabled={publish.isPending}
              onClick={() => void submit()}
              type="button"
            >
              {publish.isPending
                ? "Đang phát hành..."
                : "Phát hành policy version"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {policiesQuery.data?.map((policy) => (
            <PolicyCard key={policy.id} policy={policy} />
          ))}
          {policiesQuery.data?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-muted-foreground text-sm">
                Chưa có policy version nào.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </Main>
    </>
  );
};
