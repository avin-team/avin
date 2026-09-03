import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Checkbox } from "@avin/ui/components/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import {
  useAdminProtectionPolicies,
  usePublishAdminProtectionPolicy,
} from "../api/policy-api";
import type { AdminProtectionPolicy } from "../api/policy-api";
import { protectionPolicyFormSchema } from "../schemas/protection-policy-form-schema";

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
  const policyForm = useForm({
    defaultValues: createInitialForm(),
    onSubmit: async ({ value }) => {
      const changedAreas = value.changedAreas
        .split(",")
        .map((area) => area.trim())
        .filter(Boolean);
      try {
        await publish.mutateAsync({
          bronzeMinimumBondAmount: Number(value.bronzeMinimumBondAmount),
          diamondMinimumBondAmount: Number(value.diamondMinimumBondAmount),
          effectiveAt: value.effectiveAt,
          goldMinimumBondAmount: Number(value.goldMinimumBondAmount),
          materialChange: value.materialChange,
          materialChangeMetadata: {
            changedAreas,
            rationale: value.rationale.trim(),
          },
          membershipFeeAmount: 0,
          minimumBondAmount: Number(value.minimumBondAmount),
          reacceptDeadlineAt: value.materialChange
            ? value.reacceptDeadlineAt
            : null,
          recommendedLimitPercentage: Number(value.recommendedLimitPercentage),
          recommendedLimitRounding: Number(value.recommendedLimitRounding),
          retentionPolicyReference: value.retentionPolicyReference.trim(),
          silverMinimumBondAmount: Number(value.silverMinimumBondAmount),
          summary: value.summary.trim(),
          terms: value.terms.trim(),
          title: value.title.trim(),
          version: value.version.trim(),
          vipMinimumBondAmount: Number(value.vipMinimumBondAmount),
        });
        toast.success("Đã phát hành policy version bất biến.");
        policyForm.reset();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Không thể phát hành policy."
        );
      }
    },
    onSubmitInvalid: () => {
      toast.error("Vui lòng kiểm tra các trường bắt buộc của policy.");
    },
    validators: { onSubmit: protectionPolicyFormSchema },
  });

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
          <CardContent>
            <form
              id="protection-policy-form"
              onSubmit={async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await policyForm.handleSubmit();
              }}
            >
              <FieldGroup className="gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <policyForm.Field name="version">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Version</FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            value={field.state.value}
                          />
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </policyForm.Field>
                  <policyForm.Field name="title">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            value={field.state.value}
                          />
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </policyForm.Field>
                </div>

                <policyForm.Field name="summary">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Summary</FieldLabel>
                        <Textarea
                          aria-invalid={isInvalid}
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </policyForm.Field>
                <policyForm.Field name="terms">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Terms</FieldLabel>
                        <Textarea
                          aria-invalid={isInvalid}
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          rows={7}
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </policyForm.Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <policyForm.Field name="effectiveAt">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Effective at
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            type="datetime-local"
                            value={field.state.value}
                          />
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </policyForm.Field>
                  <policyForm.Field name="reacceptDeadlineAt">
                    {(field) => (
                      <policyForm.Field name="materialChange">
                        {(materialField) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Reaccept deadline
                              </FieldLabel>
                              <Input
                                aria-invalid={isInvalid}
                                disabled={!materialField.state.value}
                                id={field.name}
                                name={field.name}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                                type="datetime-local"
                                value={field.state.value}
                              />
                              {isInvalid ? (
                                <FieldError errors={field.state.meta.errors} />
                              ) : null}
                            </Field>
                          );
                        }}
                      </policyForm.Field>
                    )}
                  </policyForm.Field>
                </div>

                <policyForm.Field name="materialChange">
                  {(field) => (
                    <Field orientation="horizontal">
                      <Checkbox
                        checked={field.state.value}
                        id={field.name}
                        name={field.name}
                        onCheckedChange={(checked) => {
                          const isChecked = Boolean(checked);
                          field.handleChange(isChecked);
                          if (!isChecked) {
                            policyForm.setFieldValue("reacceptDeadlineAt", "");
                          }
                        }}
                      />
                      <FieldLabel htmlFor={field.name}>
                        Đây là material change
                      </FieldLabel>
                    </Field>
                  )}
                </policyForm.Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <policyForm.Field name="changedAreas">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Changed areas (phân cách bằng dấu phẩy)
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            value={field.state.value}
                          />
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </policyForm.Field>
                  <policyForm.Field name="rationale">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Material-change rationale
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            value={field.state.value}
                          />
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </policyForm.Field>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <policyForm.Field name="minimumBondAmount">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Minimum Bond (VND)
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
                            value={field.state.value}
                          />
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </policyForm.Field>
                  <policyForm.Field name="membershipFeeAmount">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          Membership Fee (VND)
                        </FieldLabel>
                        <Input
                          disabled
                          id={field.name}
                          value={field.state.value}
                        />
                        <p className="text-muted-foreground text-xs">
                          P0 cố định 0 VND; muốn bật phí phải có policy/luồng
                          hoàn tiền riêng.
                        </p>
                      </Field>
                    )}
                  </policyForm.Field>
                  <policyForm.Field name="retentionPolicyReference">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Retention policy reference
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            value={field.state.value}
                          />
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </policyForm.Field>
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
                  ).map(([fieldName, label]) => (
                    <policyForm.Field key={fieldName} name={fieldName}>
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              {label}
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
                              value={field.state.value}
                            />
                            {isInvalid ? (
                              <FieldError errors={field.state.meta.errors} />
                            ) : null}
                          </Field>
                        );
                      }}
                    </policyForm.Field>
                  ))}
                </div>
              </FieldGroup>
              <policyForm.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <Button
                    className="mt-4 w-fit"
                    disabled={!canSubmit || isSubmitting || publish.isPending}
                    form="protection-policy-form"
                    type="submit"
                  >
                    {isSubmitting || publish.isPending
                      ? "Đang phát hành..."
                      : "Phát hành policy version"}
                  </Button>
                )}
              </policyForm.Subscribe>
            </form>
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
