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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avin/ui/components/table";
import {
  ArrowClockwiseIcon,
  ClipboardTextIcon,
  DownloadSimpleIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import {
  useExportProtectionOperations,
  useProtectionOperationsQueue,
} from "../api/operations-api";
import { protectionExportFormSchema } from "../schemas/protection-export-form-schema";

const EXPORT_DATASETS = [
  { label: "Provider applications", value: "PROVIDER_APPLICATIONS" },
  { label: "Risk Reports", value: "RISK_REPORTS" },
  { label: "Provider responses", value: "PROVIDER_RESPONSES" },
  { label: "Bond Withdrawals", value: "WITHDRAWALS" },
] as const;

type ExportDataset = (typeof EXPORT_DATASETS)[number]["value"];

const QUEUE_LABELS = {
  PROVIDER_APPLICATIONS: "Provider applications",
  PROVIDER_RESPONSES: "Provider responses",
  RISK_REPORTS: "Risk Reports",
  WITHDRAWALS: "Bond Withdrawals",
} as const;

const SLA_LABELS = {
  DUE_SOON: "Sắp quá hạn",
  ON_TRACK: "Trong SLA",
  OVERDUE: "Quá hạn",
} as const;

const formatDate = (value: string): string =>
  new Date(value).toLocaleString("vi-VN");

const formatAge = (ageHours: number): string => {
  if (ageHours < 24) {
    return `${ageHours} giờ`;
  }
  return `${Math.floor(ageHours / 24)} ngày ${ageHours % 24} giờ`;
};

const getSlaVariant = (status: keyof typeof SLA_LABELS) => {
  if (status === "OVERDUE") {
    return "destructive" as const;
  }
  if (status === "DUE_SOON") {
    return "outline" as const;
  }
  return "secondary" as const;
};

export const ProtectionOperationsQueuePanel = () => {
  const queueQuery = useProtectionOperationsQueue();
  const exportMutation = useExportProtectionOperations();
  const exportForm = useForm({
    defaultValues: {
      dataset: EXPORT_DATASETS[0].value as ExportDataset,
      purpose: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await exportMutation.mutateAsync({
          dataset: value.dataset,
          purpose: value.purpose.trim(),
        });
        const blob = new Blob([result.content], { type: result.contentType });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(downloadUrl);
        toast.success(`Đã tạo export ${result.rowCount} dòng và ghi audit.`);
        exportForm.reset();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Không thể tạo controlled export."
        );
      }
    },
    validators: { onSubmit: protectionExportFormSchema },
  });

  if (queueQuery.isPending) {
    return (
      <p className="py-8 text-center text-sm">Đang tải queue Avin Check…</p>
    );
  }
  if (queueQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-destructive text-sm">
        <p>Không thể tải queue Avin Check.</p>
        <Button
          onClick={() => void queueQuery.refetch()}
          size="sm"
          variant="outline"
        >
          <ArrowClockwiseIcon /> Thử lại
        </Button>
      </div>
    );
  }

  const { items, summary } = queueQuery.data;
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tổng queue</CardDescription>
            <CardTitle className="text-3xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Trong SLA</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">
              {summary.onTrack}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sắp quá hạn</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {summary.dueSoon}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Quá hạn</CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {summary.overdue}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardTextIcon /> Protection operations queue
          </CardTitle>
          <CardDescription>
            Tuổi hồ sơ, hạn SLA và cảnh báo quá hạn cho bốn luồng vận hành P0.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue</TableHead>
                  <TableHead>Đối tượng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tuổi</TableHead>
                  <TableHead>Hạn SLA</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={`${item.queue}:${item.id}`}>
                    <TableCell>{QUEUE_LABELS[item.queue]}</TableCell>
                    <TableCell>
                      <p className="font-medium">{item.title}</p>
                      <p className="font-mono text-muted-foreground text-xs">
                        {item.id}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.status}</Badge>
                    </TableCell>
                    <TableCell>{formatAge(item.ageHours)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(item.slaDeadlineAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSlaVariant(item.slaStatus)}>
                        {SLA_LABELS[item.slaStatus]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="h-28 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      Không có việc đang chờ trong các queue Avin Check.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DownloadSimpleIcon /> Controlled export
          </CardTitle>
          <CardDescription>
            Chỉ capability PROTECTION_EXPORTER mới tải được dữ liệu trong
            disclosure matrix; mọi export phải nêu mục đích và được watermark,
            audit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,16rem)_1fr_auto] md:items-end"
            id="protection-export-form"
            onSubmit={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              await exportForm.handleSubmit();
            }}
          >
            <FieldGroup className="contents">
              <exportForm.Field name="dataset">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Dataset</FieldLabel>
                    <Select
                      items={EXPORT_DATASETS}
                      onValueChange={(value) =>
                        field.handleChange(value as ExportDataset)
                      }
                      value={field.state.value}
                    >
                      <SelectTrigger
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        id={field.name}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {EXPORT_DATASETS.map((dataset) => (
                            <SelectItem
                              key={dataset.value}
                              value={dataset.value}
                            >
                              {dataset.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </exportForm.Field>
              <exportForm.Field name="purpose">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Mục đích export
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Ví dụ: đối soát SLA tuần 34"
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </exportForm.Field>
            </FieldGroup>
            <exportForm.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={
                    !canSubmit || isSubmitting || exportMutation.isPending
                  }
                  form="protection-export-form"
                  type="submit"
                >
                  {isSubmitting || exportMutation.isPending
                    ? "Đang tạo…"
                    : "Tải controlled export"}
                </Button>
              )}
            </exportForm.Subscribe>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
