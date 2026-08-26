import {
  protectionProviderApplication,
  protectionProviderBondWithdrawal,
  protectionProviderRiskIncident,
  protectionRiskReport,
} from "@avin/db/schema/protection";
import { and, eq, inArray, isNull } from "drizzle-orm";

import type { Context } from "../runtime/context";

type Database = Context["db"];

const HOUR_MS = 60 * 60 * 1000;
const DUE_SOON_WINDOW_MS = 24 * HOUR_MS;
const PROVIDER_APPLICATION_SLA_MS = 72 * HOUR_MS;
const RISK_REPORT_SLA_MS = 48 * HOUR_MS;
const WITHDRAWAL_APPROVAL_SLA_MS = 48 * HOUR_MS;

export const protectionOperationsQueueNames = [
  "PROVIDER_APPLICATIONS",
  "RISK_REPORTS",
  "PROVIDER_RESPONSES",
  "WITHDRAWALS",
] as const;

export type ProtectionOperationsQueueName =
  (typeof protectionOperationsQueueNames)[number];

export const protectionSlaStatuses = [
  "ON_TRACK",
  "DUE_SOON",
  "OVERDUE",
] as const;

export type ProtectionSlaStatus = (typeof protectionSlaStatuses)[number];

export interface ProtectionOperationsQueueItem {
  ageHours: number;
  id: string;
  isOverdue: boolean;
  queue: ProtectionOperationsQueueName;
  slaDeadlineAt: string;
  slaStatus: ProtectionSlaStatus;
  startedAt: string;
  status: string;
  title: string;
}

export interface ProtectionOperationsQueueSummary {
  dueSoon: number;
  onTrack: number;
  overdue: number;
  total: number;
}

export interface ProtectionOperationsDashboard {
  generatedAt: string;
  items: ProtectionOperationsQueueItem[];
  summary: ProtectionOperationsQueueSummary;
}

export const getProtectionSlaStatus = (
  deadline: Date,
  now: Date
): ProtectionSlaStatus => {
  const remaining = deadline.getTime() - now.getTime();
  if (remaining <= 0) {
    return "OVERDUE";
  }
  if (remaining <= DUE_SOON_WINDOW_MS) {
    return "DUE_SOON";
  }
  return "ON_TRACK";
};

const createQueueItem = ({
  id,
  now,
  queue,
  slaDeadlineAt,
  startedAt,
  status,
  title,
}: {
  id: string;
  now: Date;
  queue: ProtectionOperationsQueueName;
  slaDeadlineAt: Date;
  startedAt: Date;
  status: string;
  title: string;
}): ProtectionOperationsQueueItem => {
  const slaStatus = getProtectionSlaStatus(slaDeadlineAt, now);
  return {
    ageHours: Math.max(
      0,
      Math.floor((now.getTime() - startedAt.getTime()) / HOUR_MS)
    ),
    id,
    isOverdue: slaStatus === "OVERDUE",
    queue,
    slaDeadlineAt: slaDeadlineAt.toISOString(),
    slaStatus,
    startedAt: startedAt.toISOString(),
    status,
    title,
  };
};

const sortQueueItems = (
  left: ProtectionOperationsQueueItem,
  right: ProtectionOperationsQueueItem
): number => {
  const statusOrder: Record<ProtectionSlaStatus, number> = {
    DUE_SOON: 1,
    ON_TRACK: 2,
    OVERDUE: 0,
  };
  const statusDifference =
    statusOrder[left.slaStatus] - statusOrder[right.slaStatus];
  if (statusDifference !== 0) {
    return statusDifference;
  }
  return left.slaDeadlineAt.localeCompare(right.slaDeadlineAt);
};

const addMilliseconds = (date: Date, milliseconds: number): Date =>
  new Date(date.getTime() + milliseconds);

export const listProtectionOperationsQueue = async ({
  database,
  now = new Date(),
}: {
  database: Database;
  now?: Date;
}): Promise<ProtectionOperationsDashboard> => {
  const [applications, reports, incidents, withdrawals] = await Promise.all([
    database
      .select()
      .from(protectionProviderApplication)
      .where(eq(protectionProviderApplication.status, "PENDING_REVIEW"))
      .execute(),
    database
      .select()
      .from(protectionRiskReport)
      .where(
        and(
          inArray(protectionRiskReport.status, [
            "SUBMITTED",
            "UNDER_REVIEW",
            "UNDER_VERIFICATION",
          ]),
          isNull(protectionRiskReport.externalSource)
        )
      )
      .execute(),
    database
      .select()
      .from(protectionProviderRiskIncident)
      .where(
        eq(protectionProviderRiskIncident.status, "AWAITING_PROVIDER_RESPONSE")
      )
      .execute(),
    database
      .select()
      .from(protectionProviderBondWithdrawal)
      .where(
        and(
          inArray(protectionProviderBondWithdrawal.status, [
            "COOLING",
            "PENDING_APPROVAL",
          ])
        )
      )
      .execute(),
  ]);

  const items: ProtectionOperationsQueueItem[] = [
    ...applications.map((application) => {
      const startedAt = application.submittedAt ?? application.createdAt;
      return createQueueItem({
        id: application.id,
        now,
        queue: "PROVIDER_APPLICATIONS",
        slaDeadlineAt: addMilliseconds(startedAt, PROVIDER_APPLICATION_SLA_MS),
        startedAt,
        status: application.status,
        title: application.fullName ?? application.providerUserId,
      });
    }),
    ...reports.map((report) => {
      const startedAt = report.submittedAt ?? report.createdAt;
      return createQueueItem({
        id: report.id,
        now,
        queue: "RISK_REPORTS",
        slaDeadlineAt: addMilliseconds(startedAt, RISK_REPORT_SLA_MS),
        startedAt,
        status: report.status,
        title: report.type,
      });
    }),
    ...incidents.map((incident) =>
      createQueueItem({
        id: incident.id,
        now,
        queue: "PROVIDER_RESPONSES",
        slaDeadlineAt: incident.responseDeadlineAt,
        startedAt: incident.createdAt,
        status: incident.status,
        title: incident.providerUserId,
      })
    ),
    ...withdrawals.map((withdrawal) => {
      const startedAt =
        withdrawal.status === "PENDING_APPROVAL"
          ? (withdrawal.recordedAt ?? withdrawal.requestedAt)
          : withdrawal.requestedAt;
      const slaDeadlineAt =
        withdrawal.status === "COOLING"
          ? withdrawal.coolingEndsAt
          : addMilliseconds(startedAt, WITHDRAWAL_APPROVAL_SLA_MS);
      return createQueueItem({
        id: withdrawal.id,
        now,
        queue: "WITHDRAWALS",
        slaDeadlineAt,
        startedAt,
        status: withdrawal.status,
        title: withdrawal.providerUserId,
      });
    }),
  ].toSorted(sortQueueItems);

  const summary: ProtectionOperationsQueueSummary = {
    dueSoon: 0,
    onTrack: 0,
    overdue: 0,
    total: items.length,
  };
  for (const item of items) {
    if (item.slaStatus === "OVERDUE") {
      summary.overdue += 1;
    } else if (item.slaStatus === "DUE_SOON") {
      summary.dueSoon += 1;
    } else {
      summary.onTrack += 1;
    }
  }

  return {
    generatedAt: now.toISOString(),
    items,
    summary,
  };
};
