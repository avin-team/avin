import type { BondAdjustmentKind } from "@avin/api/protection/bond";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import {
  useAdminProviderBonds,
  useAdminProviderDepositIntents,
  useApproveAdminProviderBondAdjustment,
  useDecideAdminProviderDepositIntent,
  useRecordAdminProviderBondAdjustment,
} from "../api/provider-bond-api";
import type {
  ProviderBond,
  ProviderDepositIntent,
} from "../api/provider-bond-api";
import {
  providerBondAdjustmentFormSchema,
  providerDepositIntentDecisionFormSchema,
} from "../schemas/provider-bond-form-schema";

const ADJUSTMENT_KIND_ITEMS: { label: string; value: BondAdjustmentKind }[] = [
  { label: "Deposit đã đối soát", value: "DEPOSIT" },
  { label: "Withdrawal", value: "WITHDRAWAL" },
  { label: "Support Allocation", value: "SUPPORT_ALLOCATION" },
  { label: "Correction", value: "CORRECTION" },
];

const ADJUSTMENT_STATUS_LABELS = {
  APPLIED: "Đã áp dụng",
  PENDING_APPROVAL: "Chờ Admin xử lý",
  REJECTED: "Đã từ chối",
} as const;

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

const optionalValue = (value: string): string | undefined => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const getAdjustmentDelta = (
  kind: BondAdjustmentKind,
  amount: string
): number => {
  const parsedAmount = Number(amount);
  if (kind === "CORRECTION") {
    return parsedAmount;
  }
  const absoluteAmount = Math.abs(parsedAmount);
  return kind === "DEPOSIT" ? absoluteAmount : -absoluteAmount;
};

const AdjustmentHistory = ({ bond }: { bond: ProviderBond }) => {
  const approve = useApproveAdminProviderBondAdjustment();

  const decide = async (
    adjustmentId: string,
    decision: "APPROVED" | "REJECTED"
  ) => {
    try {
      await approve.mutateAsync({ adjustmentId, decision });
      toast.success(
        decision === "APPROVED"
          ? "Đã áp dụng Bond Adjustment."
          : "Đã từ chối Bond Adjustment."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xử lý adjustment."
      );
    }
  };

  return (
    <div className="grid gap-3">
      <h3 className="font-medium text-sm">Lịch sử Bond Adjustment</h3>
      {bond.adjustments.length > 0 ? (
        bond.adjustments.map((adjustment) => (
          <div
            className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm lg:grid-cols-[1fr_auto]"
            key={adjustment.id}
          >
            <div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="font-medium">{adjustment.kind}</span>
                <span
                  className={
                    adjustment.deltaAmount >= 0
                      ? "text-emerald-700"
                      : "text-destructive"
                  }
                >
                  {adjustment.deltaAmount >= 0 ? "+" : ""}
                  {vndFormatter.format(adjustment.deltaAmount)}
                </span>
                <span className="text-muted-foreground">
                  {ADJUSTMENT_STATUS_LABELS[adjustment.status]}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{adjustment.reason}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Trước: {adjustment.balanceBefore ?? "—"} · Sau:{" "}
                {adjustment.balanceAfter ?? "—"}
              </p>
            </div>
            {adjustment.status === "PENDING_APPROVAL" ? (
              <div className="flex flex-wrap items-center gap-2 lg:self-center">
                <Button
                  disabled={approve.isPending}
                  onClick={() => void decide(adjustment.id, "APPROVED")}
                  size="sm"
                  type="button"
                >
                  Duyệt & áp dụng
                </Button>
                <Button
                  disabled={approve.isPending}
                  onClick={() => void decide(adjustment.id, "REJECTED")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Từ chối
                </Button>
              </div>
            ) : null}
          </div>
        ))
      ) : (
        <p className="text-muted-foreground text-sm">Chưa có adjustment.</p>
      )}
    </div>
  );
};

const ProviderDepositIntentForm = ({
  intent,
}: {
  intent: ProviderDepositIntent;
}) => {
  const decide = useDecideAdminProviderDepositIntent();
  const decisionForm = useForm({
    defaultValues: {
      decision: "MATCH" as "MATCH" | "REFUND",
      matchedAmount: "",
      reason: "",
      refundBankReference: "",
      sourceEventIds: "",
    },
    onSubmit: async ({ value }) => {
      const sourceEventIds = value.sourceEventIds
        .split(",")
        .map((sourceEventId) => sourceEventId.trim())
        .filter(Boolean);
      try {
        await decide.mutateAsync({
          decision: value.decision,
          id: intent.id,
          matchedAmount:
            value.decision === "MATCH"
              ? Number(value.matchedAmount) || intent.amount
              : undefined,
          reason: value.reason.trim(),
          refundBankReference:
            value.decision === "REFUND"
              ? value.refundBankReference.trim()
              : undefined,
          sourceEventIds: value.decision === "MATCH" ? sourceEventIds : [],
        });
        toast.success(
          value.decision === "MATCH"
            ? "Đã ghi nhận khoản Bond."
            : "Đã ghi nhận hoàn tiền Bond."
        );
        decisionForm.reset();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Không thể xử lý khoản chuyển khoản."
        );
      }
    },
    validators: { onSubmit: providerDepositIntentDecisionFormSchema },
  });

  return (
    <form
      className="grid gap-3 rounded-xl border bg-muted/20 p-4"
      id={`provider-deposit-intent-form-${intent.id}`}
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const submitter = (event.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        const decision = submitter?.value === "REFUND" ? "REFUND" : "MATCH";
        decisionForm.setFieldValue("decision", decision);
        await decisionForm.handleSubmit();
      }}
    >
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span className="font-medium">
          {intent.kind} · {intent.status}
        </span>
        <span>{vndFormatter.format(intent.amount)}</span>
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        {intent.paymentCode}
      </p>
      <FieldGroup className="gap-3">
        <decisionForm.Field name="reason">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Lý do đối soát</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Lý do và chứng từ chuyển khoản ngoài hệ thống"
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            );
          }}
        </decisionForm.Field>
        {intent.status === "REFUND_PENDING" ? null : (
          <>
            <decisionForm.Field name="matchedAmount">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Số tiền Bond đã nhận
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      id={field.name}
                      inputMode="numeric"
                      min={1_000_000}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder={`Mặc định ${intent.amount.toLocaleString("vi-VN")} VND`}
                      type="number"
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </decisionForm.Field>
            <decisionForm.Field name="sourceEventIds">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      SePay source event IDs
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Source event UUIDs, phân cách bằng dấu phẩy"
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </decisionForm.Field>
          </>
        )}
        <decisionForm.Field name="refundBankReference">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  External bank reference hoàn tiền
                </FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Bắt buộc nếu chọn hoàn tiền"
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            );
          }}
        </decisionForm.Field>
      </FieldGroup>
      <decisionForm.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <div className="flex flex-wrap gap-2">
            {intent.status === "REFUND_PENDING" ? null : (
              <Button
                disabled={!canSubmit || isSubmitting || decide.isPending}
                form={`provider-deposit-intent-form-${intent.id}`}
                name="decision"
                size="sm"
                type="submit"
                value="MATCH"
              >
                Ghi nhận Bond
              </Button>
            )}
            <Button
              disabled={!canSubmit || isSubmitting || decide.isPending}
              form={`provider-deposit-intent-form-${intent.id}`}
              name="decision"
              size="sm"
              type="submit"
              value="REFUND"
              variant="outline"
            >
              Đã hoàn tiền
            </Button>
          </div>
        )}
      </decisionForm.Subscribe>
    </form>
  );
};

const ProviderDepositIntentQueue = () => {
  const { data: intents = [], isPending } = useAdminProviderDepositIntents();

  const actionableIntents = intents.filter((intent) =>
    ["MANUAL_REVIEW", "REFUND_PENDING"].includes(intent.status)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đối soát chuyển khoản Provider</CardTitle>
        <CardDescription>
          Chỉ SUPER_ADMIN được xử lý khoản trễ, thiếu, thừa, tách giao dịch hoặc
          hoàn Bond.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isPending ? (
          <output aria-live="polite">Đang tải hàng đợi chuyển khoản...</output>
        ) : null}
        {!isPending && actionableIntents.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Không có khoản cần đối soát thủ công.
          </p>
        ) : null}
        {actionableIntents.map((intent) => (
          <ProviderDepositIntentForm intent={intent} key={intent.id} />
        ))}
      </CardContent>
    </Card>
  );
};

const ProviderBondCard = ({ bond }: { bond: ProviderBond }) => (
  <Card>
    <CardHeader>
      <CardTitle>{bond.profile.displayName}</CardTitle>
      <CardDescription>
        {bond.profile.location} · {bond.profile.profileSlug} ·{" "}
        {bond.profile.status} · {bond.profile.providerUserId}
      </CardDescription>
    </CardHeader>
    <CardContent className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="font-medium text-sm">Recognized Provider Bond</p>
          <p className="mt-1 font-semibold text-2xl">
            {vndFormatter.format(bond.recognizedAmount)}
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Hạng {bond.tier} · Xác minh {bond.verifiedAt ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="font-medium text-sm">Recommended Transaction Limit</p>
          <p className="mt-2 font-semibold text-2xl">
            {vndFormatter.format(bond.recommendedTransactionLimit)}
          </p>
          <p className="mt-2 text-muted-foreground text-xs">
            Tự động bằng tối đa 80% Bond, làm tròn xuống 100.000 VND; Admin
            không chỉnh độc lập.
          </p>
        </div>
      </div>
      <div className="rounded-xl border bg-muted/20 p-4 text-sm">
        <p className="font-medium">Tài khoản ngân hàng chính</p>
        {bond.primaryBankAccount ? (
          <p className="mt-1 font-mono">
            {bond.primaryBankAccount.accountName} ·{" "}
            {bond.primaryBankAccount.accountNumber} ·{" "}
            {bond.primaryBankAccount.bankCode}
          </p>
        ) : (
          <p className="mt-1 text-muted-foreground">Chưa cung cấp</p>
        )}
      </div>
      <AdjustmentHistory bond={bond} />
    </CardContent>
  </Card>
);

export const ProviderBondPage = () => {
  const { data: bonds = [], isPending } = useAdminProviderBonds();
  const record = useRecordAdminProviderBondAdjustment();
  const providerItems = [
    { label: "Chọn Provider", value: null },
    ...bonds.map((bond) => ({
      label: `${bond.profile.displayName} · ${bond.profile.profileSlug}`,
      value: bond.profile.id,
    })),
  ];
  const adjustmentForm = useForm({
    defaultValues: {
      amount: "",
      evidenceReference: "",
      externalBankReference: "",
      kind: "DEPOSIT" as BondAdjustmentKind,
      profileId: bonds[0]?.profile.id ?? "",
      reason: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await record.mutateAsync({
          deltaAmount: getAdjustmentDelta(value.kind, value.amount),
          evidenceReference: optionalValue(value.evidenceReference),
          externalBankReference: optionalValue(value.externalBankReference),
          idempotencyKey: `bond-${crypto.randomUUID()}`,
          kind: value.kind,
          profileId: value.profileId,
          reason: value.reason.trim(),
        });
        toast.success("Đã ghi Bond Adjustment.");
        adjustmentForm.reset();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Không thể ghi adjustment."
        );
      }
    },
    validators: { onSubmit: providerBondAdjustmentFormSchema },
  });

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="font-medium text-primary text-sm">
            AVIN CHECK · PROVIDER BOND
          </p>
          <h1 className="mt-1 font-semibold text-3xl tracking-tight">
            Đối soát và phê duyệt Provider Bond
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Các khoản chuyển vào tài khoản lưu ký Avin Check được đối soát tự
            động qua SePay; trường hợp ngoại lệ cần SUPER_ADMIN xử lý và ghi lý
            do.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ghi adjustment</CardTitle>
            <CardDescription>
              Deposit cần external bank reference và evidence. Withdrawal,
              support allocation, correction sẽ chờ Admin xử lý.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              id="provider-bond-adjustment-form"
              onSubmit={async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await adjustmentForm.handleSubmit();
              }}
            >
              <adjustmentForm.Field name="profileId">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Provider</FieldLabel>
                      <Select
                        items={providerItems}
                        onValueChange={(value) =>
                          field.handleChange(value ?? "")
                        }
                        value={field.state.value || null}
                      >
                        <SelectTrigger
                          className="h-9 w-full rounded-md border border-input bg-background px-3"
                          id={field.name}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {providerItems.map((item) => (
                              <SelectItem
                                key={item.value ?? "empty"}
                                value={item.value}
                              >
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </adjustmentForm.Field>
              <adjustmentForm.Field name="kind">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Loại adjustment
                    </FieldLabel>
                    <Select
                      items={ADJUSTMENT_KIND_ITEMS}
                      onValueChange={(value) =>
                        field.handleChange(value as BondAdjustmentKind)
                      }
                      value={field.state.value}
                    >
                      <SelectTrigger
                        className="h-9 w-full rounded-md border border-input bg-background px-3"
                        id={field.name}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ADJUSTMENT_KIND_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </adjustmentForm.Field>
              <adjustmentForm.Field name="amount">
                {(field) => (
                  <adjustmentForm.Field name="kind">
                    {(kindField) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            {kindField.state.value === "CORRECTION"
                              ? "Delta VND (+/-)"
                              : "Số tiền VND"}
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            inputMode="numeric"
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder={
                              kindField.state.value === "CORRECTION"
                                ? "-1000000"
                                : "1000000"
                            }
                            type="number"
                            value={field.state.value}
                          />
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </adjustmentForm.Field>
                )}
              </adjustmentForm.Field>
              <adjustmentForm.Field name="externalBankReference">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        External bank reference
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Bắt buộc với Deposit"
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </adjustmentForm.Field>
              <adjustmentForm.Field name="evidenceReference">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Evidence reference
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Private evidence reference"
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </adjustmentForm.Field>
              <adjustmentForm.Field name="reason">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field className="md:col-span-2" data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Lý do</FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Mô tả kết quả đối soát hoặc nghĩa vụ liên quan"
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </adjustmentForm.Field>
              <adjustmentForm.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <div className="md:col-span-2">
                    <Button
                      disabled={!canSubmit || isSubmitting || record.isPending}
                      form="provider-bond-adjustment-form"
                      type="submit"
                    >
                      {isSubmitting || record.isPending
                        ? "Đang ghi..."
                        : "Ghi Bond Adjustment"}
                    </Button>
                  </div>
                )}
              </adjustmentForm.Subscribe>
            </form>
          </CardContent>
        </Card>

        <ProviderDepositIntentQueue />

        {isPending ? (
          <output aria-live="polite">Đang tải Bond...</output>
        ) : null}
        {!isPending && bonds.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground text-sm">
              Chưa có Provider profile để đối soát.
            </CardContent>
          </Card>
        ) : null}
        {bonds.map((bond) => (
          <ProviderBondCard bond={bond} key={bond.profile.id} />
        ))}
      </Main>
    </>
  );
};
