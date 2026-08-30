import { Badge } from "@avin/ui/components/badge";
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
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import {
  useInviteProtectionPilotProvider,
  useProtectionPilotConfiguration,
  useProtectionPilotInvitations,
  useUpdateProtectionPilotConfiguration,
} from "../api/pilot-api";
import {
  pilotConfigurationFormSchema,
  pilotInvitationFormSchema,
} from "../schemas/pilot-form-schema";

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chưa sử dụng";

const PilotConfigurationForm = ({
  initialApprovalCap,
  initialEnabled,
  isPending,
  onSave,
}: {
  initialApprovalCap: number;
  initialEnabled: boolean;
  isPending: boolean;
  onSave: (approvalCap: number, enabled: boolean) => Promise<void>;
}) => {
  const configurationForm = useForm({
    defaultValues: {
      approvalCap: String(initialApprovalCap),
      enabled: initialEnabled,
    },
    onSubmit: async ({ value }) => {
      await onSave(Number(value.approvalCap), value.enabled);
    },
    validators: { onSubmit: pilotConfigurationFormSchema },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cấu hình giới hạn approval</CardTitle>
        <CardDescription>
          Tắt pilot chỉ dùng khi Protection Manager đã có quyết định vận hành
          mới; thay đổi được audit bởi procedure quản trị.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="pilot-configuration-form"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await configurationForm.handleSubmit();
          }}
        >
          <FieldGroup className="gap-4 sm:grid sm:grid-cols-[1fr_auto] sm:items-end">
            <configurationForm.Field name="approvalCap">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Approval cap (10–20)
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      id={field.name}
                      inputMode="numeric"
                      max={20}
                      min={10}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
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
            </configurationForm.Field>
            <div className="flex flex-wrap items-center gap-3">
              <configurationForm.Field name="enabled">
                {(field) => (
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor={field.name}>
                      <input
                        checked={field.state.value}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.checked)
                        }
                        type="checkbox"
                      />
                      Giới hạn invitation đang bật
                    </FieldLabel>
                  </Field>
                )}
              </configurationForm.Field>
              <configurationForm.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <Button
                    disabled={!canSubmit || isSubmitting || isPending}
                    form="pilot-configuration-form"
                    type="submit"
                  >
                    {isSubmitting || isPending ? "Đang lưu…" : "Lưu cấu hình"}
                  </Button>
                )}
              </configurationForm.Subscribe>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export const ProtectionPilotPage = () => {
  const configurationQuery = useProtectionPilotConfiguration();
  const invitationsQuery = useProtectionPilotInvitations();
  const updateConfiguration = useUpdateProtectionPilotConfiguration();
  const inviteProvider = useInviteProtectionPilotProvider();

  const saveConfiguration = async (
    approvalCap: number,
    enabled: boolean
  ): Promise<void> => {
    try {
      await updateConfiguration.mutateAsync({
        approvalCap,
        enabled,
      });
      toast.success("Đã lưu giới hạn invitation pilot.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu cấu hình pilot."
      );
    }
  };

  const invitationForm = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      try {
        await inviteProvider.mutateAsync({ email: value.email.trim() });
        toast.success("Đã thêm Provider vào danh sách invitation.");
        invitationForm.reset();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Không thể tạo invitation cho Provider."
        );
      }
    },
    validators: { onSubmit: pilotInvitationFormSchema },
  });

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="font-medium text-primary text-sm">AVIN CHECK · PILOT</p>
          <h1 className="mt-1 font-semibold text-3xl tracking-tight">
            Invitation-limited Provider pilot
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Application vẫn mở quanh năm, nhưng chỉ Provider đã được mời mới có
            thể được duyệt trong pilot và tổng số profile được duyệt không vượt
            quá cap 10–20.
          </p>
        </div>

        <PilotConfigurationForm
          initialApprovalCap={configurationQuery.data?.approvalCap ?? 10}
          initialEnabled={configurationQuery.data?.enabled ?? true}
          isPending={updateConfiguration.isPending}
          key={configurationQuery.data?.updatedAt ?? "default"}
          onSave={saveConfiguration}
        />

        <Card>
          <CardHeader>
            <CardTitle>Mời Provider</CardTitle>
            <CardDescription>
              Chỉ tài khoản có role Provider hiện hữu mới được thêm vào pilot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 sm:flex-row"
              id="pilot-invitation-form"
              onSubmit={async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await invitationForm.handleSubmit();
              }}
            >
              <invitationForm.Field name="email">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field className="flex-1" data-invalid={isInvalid}>
                      <FieldLabel className="sr-only" htmlFor={field.name}>
                        Email Provider cần mời
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="provider@example.com"
                        type="email"
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </invitationForm.Field>
              <invitationForm.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <Button
                    disabled={
                      !canSubmit || isSubmitting || inviteProvider.isPending
                    }
                    form="pilot-invitation-form"
                    type="submit"
                  >
                    {isSubmitting || inviteProvider.isPending
                      ? "Đang thêm…"
                      : "Thêm invitation"}
                  </Button>
                )}
              </invitationForm.Subscribe>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách invitation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {invitationsQuery.data?.map((invitation) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                key={invitation.id}
              >
                <div>
                  <p className="font-medium">{invitation.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {invitation.email} · tạo {formatDate(invitation.createdAt)}
                  </p>
                </div>
                <Badge variant={invitation.usedAt ? "secondary" : "outline"}>
                  {invitation.usedAt
                    ? `Đã dùng ${formatDate(invitation.usedAt)}`
                    : "Chưa dùng"}
                </Badge>
              </div>
            ))}
            {invitationsQuery.data?.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Chưa có Provider nào được mời.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </Main>
    </>
  );
};
