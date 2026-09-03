import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
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
import { Textarea } from "@avin/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

import { riskReportCorrectionFormSchema } from "../schemas/risk-report-correction-form-schema";

const requesterRelationshipOptions = [
  { label: "Tôi là người bị nêu trong cảnh báo", value: "SUBJECT" },
  {
    label: "Tôi là đại diện có thẩm quyền",
    value: "AUTHORIZED_REPRESENTATIVE",
  },
] as const;

type RequesterRelationship =
  (typeof requesterRelationshipOptions)[number]["value"];

export const RiskReportCorrectionPage = () => {
  const { reportId: initialReportId } = useSearch({
    from: "/(public)/avin-check/correction",
  });
  const [errorMessage, setErrorMessage] = useState<string>();
  const correction = useMutation(
    orpc.protection.riskReport.requestCorrection.mutationOptions()
  );
  const correctionForm = useForm({
    defaultValues: {
      authorityEvidenceReference: "",
      reason: "",
      reportId: initialReportId ?? "",
      requesterRelationship: "SUBJECT" as RequesterRelationship,
    },
    onSubmit: async ({ value }) => {
      setErrorMessage(undefined);
      try {
        await correction.mutateAsync({
          authorityEvidenceReference: value.authorityEvidenceReference.trim(),
          reason: value.reason.trim(),
          reportId: value.reportId.trim(),
          requesterRelationship: value.requesterRelationship,
        });
      } catch {
        setErrorMessage(
          "Không thể gửi yêu cầu. Kiểm tra mã báo cáo và bằng chứng quyền sở hữu rồi thử lại."
        );
      }
    },
    validators: { onSubmit: riskReportCorrectionFormSchema },
  });

  return (
    <Shell as="div" className="gap-8" variant="default">
      <section className="rounded-[2rem] border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card px-6 py-10 shadow-sm sm:px-10">
        <p className="font-semibold text-primary text-sm">Avin Check</p>
        <h1 className="mt-3 font-black text-4xl tracking-tight sm:text-5xl">
          Yêu cầu đính chính cảnh báo
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
          Chỉ tài khoản Buyer hoặc Seller đã đăng nhập mới có thể gửi yêu cầu.
          Đăng nhập không tự chứng minh quyền sở hữu; Avin sẽ kiểm tra bằng
          chứng cứ bạn cung cấp.
        </p>
      </section>

      {errorMessage ? (
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Chưa thể gửi yêu cầu</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {correction.isSuccess ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Đã tiếp nhận yêu cầu đính chính</CardTitle>
            <CardDescription>
              Moderator sẽ xem xét riêng tư và thông báo kết quả trong account
              Avin của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary underline" to="/avin-check/reports">
              Mở Báo cáo của tôi
            </Link>
          </CardContent>
        </Card>
      ) : (
        <form
          className="grid gap-6"
          id="risk-report-correction-form"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await correctionForm.handleSubmit();
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Thông tin yêu cầu</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FieldGroup>
                <correctionForm.Field name="reportId">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Mã Risk Report
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
                </correctionForm.Field>

                <correctionForm.Field name="requesterRelationship">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="correction-relationship">
                        Tư cách yêu cầu
                      </FieldLabel>
                      <Select
                        items={requesterRelationshipOptions}
                        onValueChange={(value) => {
                          const relationship =
                            requesterRelationshipOptions.find(
                              (item) => item.value === value
                            )?.value;
                          if (relationship) {
                            field.handleChange(relationship);
                          }
                        }}
                        value={field.state.value}
                      >
                        <SelectTrigger
                          aria-invalid={
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid
                          }
                          className="w-full"
                          id="correction-relationship"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {requesterRelationshipOptions.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {field.state.meta.isTouched &&
                      !field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )}
                </correctionForm.Field>

                <correctionForm.Field name="reason">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Nội dung cần đính chính
                        </FieldLabel>
                        <Textarea
                          aria-invalid={isInvalid}
                          id={field.name}
                          minLength={20}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          rows={6}
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </correctionForm.Field>

                <correctionForm.Field name="authorityEvidenceReference">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Tham chiếu bằng chứng quyền sở hữu / đại diện
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          placeholder="Mã tài liệu hoặc liên kết bằng chứng đã được Avin cấp"
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </correctionForm.Field>
              </FieldGroup>
              <correctionForm.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <Button
                    disabled={
                      !canSubmit || isSubmitting || correction.isPending
                    }
                    form="risk-report-correction-form"
                    type="submit"
                  >
                    {isSubmitting || correction.isPending
                      ? "Đang gửi…"
                      : "Gửi yêu cầu đính chính"}
                  </Button>
                )}
              </correctionForm.Subscribe>
            </CardContent>
          </Card>
        </form>
      )}
    </Shell>
  );
};
