import type { OrderItemTimelineView } from "@avin/api/commerce/fulfillment";
import { Badge } from "@avin/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Separator } from "@avin/ui/components/separator";
import { FileText, ShieldCheck, Timer } from "@phosphor-icons/react";

import {
  formatOrderDeadline,
  formatOrderDate,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
} from "@/features/commerce/order-status";
import { getSafeEvidenceHref } from "@/utils/get-safe-evidence-href";

const ACTOR_LABELS: Record<
  OrderItemTimelineView["events"][number]["actorType"],
  string
> = {
  ADMIN: "Admin",
  BUYER: "Buyer",
  SELLER: "Seller",
  SYSTEM: "Hệ thống",
};

const EvidenceFile = ({
  file,
}: {
  file: NonNullable<
    OrderItemTimelineView["deliverySubmission"]
  >["files"][number];
}) => {
  const href = getSafeEvidenceHref(file.storageKey);
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm">
      <FileText aria-hidden="true" />
      {href ? (
        <a
          className="truncate text-primary underline-offset-4 hover:underline"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {file.fileName}
        </a>
      ) : (
        <span className="min-w-0 truncate" title={file.storageKey}>
          {file.fileName} · {file.storageKey}
        </span>
      )}
    </li>
  );
};

export const OrderItemTimeline = ({
  timeline,
}: {
  timeline: OrderItemTimelineView;
}) => (
  <div className="flex flex-col gap-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">Trạng thái hiện tại</p>
        <Badge
          className="mt-2"
          variant={getOrderItemStatusVariant(timeline.current.status)}
        >
          {getOrderItemStatusLabel(timeline.current.status)}
        </Badge>
      </div>
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Timer aria-hidden="true" />
          Hạn xử lý
        </p>
        <p className="mt-2 text-sm font-medium">
          {formatOrderDeadline(timeline.current.processingDeadlineAt)}
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck aria-hidden="true" />
          Hạn review / bảo hành
        </p>
        <p className="mt-2 text-sm font-medium">
          {timeline.current.status === "DELIVERED"
            ? formatOrderDeadline(timeline.current.deliveryReviewDeadlineAt)
            : formatOrderDeadline(timeline.current.warrantyExpiresAt)}
        </p>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">WarrantyPolicy</CardTitle>
        <CardDescription>
          {timeline.current.warrantyPolicy.durationHours} giờ kể từ khi vào
          Warranty.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p className="whitespace-pre-wrap text-muted-foreground">
          {timeline.current.warrantyPolicy.terms}
        </p>
        {timeline.current.warrantyStartedAt ? (
          <p className="text-xs text-muted-foreground">
            Bắt đầu: {formatOrderDate(timeline.current.warrantyStartedAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>

    {timeline.deliverySubmission ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bằng chứng bàn giao</CardTitle>
          <CardDescription>
            Bàn giao lúc{" "}
            {formatOrderDate(timeline.deliverySubmission.deliveredAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap text-sm">
            {timeline.deliverySubmission.deliveryNote}
          </p>
          {timeline.deliverySubmission.files.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {timeline.deliverySubmission.files.map((file) => (
                <EvidenceFile file={file} key={file.id} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Không có file hoặc liên kết đính kèm.
            </p>
          )}
        </CardContent>
      </Card>
    ) : null}

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">
          {timeline.events.map((event, index) => (
            <li className="flex gap-3" key={event.id}>
              <div className="flex flex-col items-center">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                {index < timeline.events.length - 1 ? (
                  <Separator
                    className="my-2 min-h-5 flex-1"
                    orientation="vertical"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {getOrderItemStatusLabel(event.newStatus)}
                  </p>
                  <Badge variant="outline">
                    {ACTOR_LABELS[event.actorType]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatOrderDate(event.effectiveAt)}
                </p>
                {event.reason ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {event.reason}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  </div>
);
