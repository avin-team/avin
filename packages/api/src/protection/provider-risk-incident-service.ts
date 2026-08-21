import {
  protectionProviderProfile,
  protectionProviderProfileVersion,
  protectionProviderRiskIncident,
  protectionProviderRiskIncidentEvidence,
  protectionProviderRiskIncidentHistory,
  protectionRiskReport,
} from "@avin/db/schema/protection";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { createNotificationEvent } from "../notifications/notification";
import type { Context } from "../runtime/context";
import {
  isRiskReportEvidenceFileNameAllowed,
  isProviderRiskIncidentEvidenceKey,
  RISK_REPORT_EVIDENCE_CONTENT_TYPES,
  RISK_REPORT_EVIDENCE_MAX_COUNT,
  RISK_REPORT_EVIDENCE_MAX_BYTES,
} from "../runtime/storage";
import { publishProviderProfileStatusInTransaction } from "./provider-application-service";
import {
  assertProviderRiskIncidentTransition,
  getProviderRiskResponseDeadline,
  isProviderRiskResponseOpen,
} from "./provider-risk-incident";
import type {
  ProviderRiskIncidentEvidenceInput,
  ProviderRiskIncidentLinkInput,
  ProviderRiskIncidentReviewInput,
  ProviderRiskIncidentResponseInput,
} from "./provider-risk-incident";
import {
  createRiskReportPublicPath,
  publicRiskReportStatuses,
} from "./risk-report";

type Database = Context["db"];
type ProviderProfileVersion =
  typeof protectionProviderProfileVersion.$inferSelect;
type ProviderRiskIncident = typeof protectionProviderRiskIncident.$inferSelect;
type ProviderRiskIncidentEvidence =
  typeof protectionProviderRiskIncidentEvidence.$inferSelect;
type ProviderRiskIncidentHistory =
  typeof protectionProviderRiskIncidentHistory.$inferSelect;

const INCIDENT_SOURCE_TYPE = "PROTECTION_PROVIDER_RISK_INCIDENT";
const ELIGIBLE_REPORT_STATUSES = [
  "UNDER_REVIEW",
  ...publicRiskReportStatuses,
] as const;

const toIso = (value: Date | null): string | null =>
  value?.toISOString() ?? null;

const throwBadRequest = (message: string): never => {
  throw new ORPCError("BAD_REQUEST", { message });
};

const findIncident = async (database: Database, incidentId: string) => {
  const [row] = await database
    .select({
      incident: protectionProviderRiskIncident,
      profile: protectionProviderProfile,
      profileVersion: protectionProviderProfileVersion,
      report: protectionRiskReport,
    })
    .from(protectionProviderRiskIncident)
    .innerJoin(
      protectionProviderProfile,
      eq(
        protectionProviderRiskIncident.providerProfileId,
        protectionProviderProfile.id
      )
    )
    .innerJoin(
      protectionProviderProfileVersion,
      eq(
        protectionProviderRiskIncident.providerProfileVersionId,
        protectionProviderProfileVersion.id
      )
    )
    .innerJoin(
      protectionRiskReport,
      eq(protectionProviderRiskIncident.riskReportId, protectionRiskReport.id)
    )
    .where(eq(protectionProviderRiskIncident.id, incidentId))
    .limit(1);
  return row ?? null;
};

const findIncidentMaterials = async (
  database: Database,
  incidentId: string
): Promise<{
  evidence: ProviderRiskIncidentEvidence[];
  history: ProviderRiskIncidentHistory[];
}> => {
  const [evidence, history] = await Promise.all([
    database
      .select()
      .from(protectionProviderRiskIncidentEvidence)
      .where(eq(protectionProviderRiskIncidentEvidence.incidentId, incidentId))
      .orderBy(asc(protectionProviderRiskIncidentEvidence.createdAt))
      .execute(),
    database
      .select()
      .from(protectionProviderRiskIncidentHistory)
      .where(eq(protectionProviderRiskIncidentHistory.incidentId, incidentId))
      .orderBy(asc(protectionProviderRiskIncidentHistory.createdAt))
      .execute(),
  ]);
  return { evidence, history };
};

const toProfileVersionView = (version: ProviderProfileVersion) => ({
  displayName: version.displayName,
  profileSlug: version.profileSlug,
  publishedAt: version.publishedAt.toISOString(),
  services: version.services,
  status: version.status,
  versionId: version.id,
  versionNumber: version.versionNumber,
});

const toAdminProfileVersionView = (version: ProviderProfileVersion) => ({
  ...toProfileVersionView(version),
  officialChannels: version.officialChannels,
  paymentAccount: version.paymentAccount,
});

const toAdminEvidenceView = (evidence: ProviderRiskIncidentEvidence) => ({
  contentType: evidence.contentType,
  createdAt: evidence.createdAt.toISOString(),
  fileName: evidence.fileName,
  id: evidence.id,
  immutableAt: evidence.immutableAt.toISOString(),
  kind: evidence.kind,
  originalStorageKey: evidence.originalStorageKey,
  scanReason: evidence.scanReason,
  scanStatus: evidence.scanStatus,
  sha256: evidence.sha256,
  sizeBytes: evidence.sizeBytes,
});

const toProviderEvidenceView = (evidence: ProviderRiskIncidentEvidence) => ({
  contentType: evidence.contentType,
  createdAt: evidence.createdAt.toISOString(),
  fileName: evidence.fileName,
  id: evidence.id,
  kind: evidence.kind,
  scanStatus: evidence.scanStatus,
  sizeBytes: evidence.sizeBytes,
});

const toAdminHistoryView = (history: ProviderRiskIncidentHistory) => ({
  actorUserId: history.actorUserId,
  createdAt: history.createdAt.toISOString(),
  id: history.id,
  reason: history.reason,
  status: history.status,
});

const toProviderHistoryView = (history: ProviderRiskIncidentHistory) => ({
  createdAt: history.createdAt.toISOString(),
  id: history.id,
  status: history.status,
});

const toPublicWarningLink = (report: {
  publicSlug: string | null;
  publishedAt: Date | null;
  status: string;
  type: string;
}) => {
  if (
    !report.publicSlug ||
    !publicRiskReportStatuses.includes(
      report.status as (typeof publicRiskReportStatuses)[number]
    )
  ) {
    return null;
  }
  return {
    publicPath: createRiskReportPublicPath(report.publicSlug),
    publicSlug: report.publicSlug,
    publishedAt: toIso(report.publishedAt),
    status: report.status,
    type: report.type,
  };
};

const toAdminIncidentView = (
  row: NonNullable<Awaited<ReturnType<typeof findIncident>>>,
  materials: Awaited<ReturnType<typeof findIncidentMaterials>>
) => ({
  createdAt: row.incident.createdAt.toISOString(),
  evidence: materials.evidence.map(toAdminEvidenceView),
  history: materials.history.map(toAdminHistoryView),
  id: row.incident.id,
  noticeVerifiedAt: row.incident.noticeVerifiedAt.toISOString(),
  profile: {
    id: row.profile.id,
    profileSlug: row.profile.profileSlug,
    providerUserId: row.profile.providerUserId,
    status: row.profile.status,
  },
  profileVersion: toAdminProfileVersionView(row.profileVersion),
  providerRespondedAt: toIso(row.incident.providerRespondedAt),
  providerResponse: row.incident.providerResponse,
  responseDeadlineAt: row.incident.responseDeadlineAt.toISOString(),
  reviewReason: row.incident.reviewReason,
  reviewedAt: toIso(row.incident.reviewedAt),
  reviewedByUserId: row.incident.reviewedByUserId,
  riskReport: {
    id: row.report.id,
    publicSlug: row.report.publicSlug,
    status: row.report.status,
    type: row.report.type,
  },
  status: row.incident.status,
  updatedAt: row.incident.updatedAt.toISOString(),
});

const toProviderIncidentView = (
  row: NonNullable<Awaited<ReturnType<typeof findIncident>>>,
  materials: Awaited<ReturnType<typeof findIncidentMaterials>>
) => ({
  createdAt: row.incident.createdAt.toISOString(),
  evidence: materials.evidence.map(toProviderEvidenceView),
  history: materials.history.map(toProviderHistoryView),
  id: row.incident.id,
  noticeVerifiedAt: row.incident.noticeVerifiedAt.toISOString(),
  profileVersion: toProfileVersionView(row.profileVersion),
  providerRespondedAt: toIso(row.incident.providerRespondedAt),
  providerResponse: row.incident.providerResponse,
  publicWarning: toPublicWarningLink(row.report),
  responseDeadlineAt: row.incident.responseDeadlineAt.toISOString(),
  riskReportId: row.report.id,
  status: row.incident.status,
  updatedAt: row.incident.updatedAt.toISOString(),
});

const appendIncidentHistory = async (
  database: Database,
  incidentId: string,
  status: ProviderRiskIncident["status"],
  actorUserId: string | null,
  reason: string | null,
  createdAt: Date
): Promise<void> => {
  await database.insert(protectionProviderRiskIncidentHistory).values({
    actorUserId,
    createdAt,
    incidentId,
    reason,
    status,
  });
};

const notifyProviderIncident = async ({
  database,
  eventType,
  incident,
  now,
  title,
  body,
  emailBody,
  emailSubject,
}: {
  body: string;
  database: Database;
  emailBody: string;
  emailSubject: string;
  eventType:
    | "protection_provider_risk_incident.related_report"
    | "protection_provider_risk_incident.removed"
    | "protection_provider_risk_incident.response_deadline"
    | "protection_provider_risk_incident.suspended";
  incident: ProviderRiskIncident;
  now: Date;
  title: string;
}) => {
  await createNotificationEvent(database, {
    body,
    context: {
      incidentId: incident.id,
      profileVersionId: incident.providerProfileVersionId,
      responseDeadlineAt: incident.responseDeadlineAt.toISOString(),
      riskReportId: incident.riskReportId,
    },
    email: {
      htmlBody: emailBody,
      recipientUserIds: [incident.providerUserId],
      subject: emailSubject,
      textBody: body,
    },
    eventType,
    now,
    recipients: [{ targetPath: "/provider", userId: incident.providerUserId }],
    sourceId: incident.id,
    sourceType: INCIDENT_SOURCE_TYPE,
    title,
  });
};

const notifyProviderIncidentDeadline = async (
  database: Database,
  incident: ProviderRiskIncident,
  now: Date
): Promise<void> => {
  await createNotificationEvent(database, {
    body: "Hạn phản hồi cho thông báo Avin Check của bạn là 48 giờ kể từ lúc xác minh. Hãy gửi phản hồi và bằng chứng riêng tư trước thời hạn.",
    context: {
      incidentId: incident.id,
      responseDeadlineAt: incident.responseDeadlineAt.toISOString(),
    },
    email: {
      htmlBody:
        "<p>Hạn phản hồi cho thông báo Avin Check của bạn là 48 giờ kể từ lúc xác minh.</p><p>Hãy gửi phản hồi và bằng chứng riêng tư trước thời hạn.</p>",
      recipientUserIds: [incident.providerUserId],
      subject: "Avin Check: hạn phản hồi thông báo Provider",
      textBody:
        "Hạn phản hồi cho thông báo Avin Check của bạn là 48 giờ kể từ lúc xác minh. Hãy gửi phản hồi và bằng chứng riêng tư trước thời hạn.",
    },
    eventType: "protection_provider_risk_incident.response_deadline",
    now,
    recipients: [{ targetPath: "/provider", userId: incident.providerUserId }],
    sourceId: `${incident.id}:deadline`,
    sourceType: INCIDENT_SOURCE_TYPE,
    title: "Hạn phản hồi Provider đã được xác lập",
  });
};

const notifyProviderIncidentRelatedReport = async (
  database: Database,
  incident: ProviderRiskIncident,
  now: Date
): Promise<void> => {
  await notifyProviderIncident({
    body: "Một báo cáo Avin Check đã được xác minh là có liên quan đến profile Provider của bạn. Bạn có thể gửi phản hồi và bằng chứng riêng tư trong workspace.",
    database,
    emailBody:
      "<p>Một báo cáo Avin Check đã được xác minh là có liên quan đến profile Provider của bạn.</p><p>Bạn có thể gửi phản hồi và bằng chứng riêng tư trong workspace.</p>",
    emailSubject: "Avin Check: có báo cáo liên quan đến profile Provider",
    eventType: "protection_provider_risk_incident.related_report",
    incident,
    now,
    title: "Có báo cáo Avin Check liên quan",
  });
};

const notifyProviderIncidentSuspended = async (
  database: Database,
  incident: ProviderRiskIncident,
  now: Date
): Promise<void> => {
  await notifyProviderIncident({
    body: "Profile Provider của bạn đã được tạm ngưng để xem xét do không nhận được phản hồi trong thời hạn. Đây không phải là kết luận gian lận tự động.",
    database,
    emailBody:
      "<p>Profile Provider của bạn đã được tạm ngưng để xem xét do không nhận được phản hồi trong thời hạn.</p><p>Đây không phải là kết luận gian lận tự động.</p>",
    emailSubject: "Avin Check: profile Provider tạm ngưng để xem xét",
    eventType: "protection_provider_risk_incident.suspended",
    incident,
    now,
    title: "Profile Provider tạm ngưng để xem xét",
  });
};

const notifyProviderIncidentRemoved = async (
  database: Database,
  incident: ProviderRiskIncident,
  now: Date
): Promise<void> => {
  await notifyProviderIncident({
    body: "Profile Provider của bạn đã được gỡ khỏi danh mục active sau quyết định xác nhận gian lận có chủ ý của Protection Manager.",
    database,
    emailBody:
      "<p>Profile Provider của bạn đã được gỡ khỏi danh mục active sau quyết định xác nhận gian lận có chủ ý của Protection Manager.</p>",
    emailSubject: "Avin Check: profile Provider đã bị gỡ vì gian lận",
    eventType: "protection_provider_risk_incident.removed",
    incident,
    now,
    title: "Profile Provider đã bị gỡ vì gian lận",
  });
};

const validateIncidentReportStatus = (status: string): void => {
  if (
    !ELIGIBLE_REPORT_STATUSES.includes(
      status as (typeof ELIGIBLE_REPORT_STATUSES)[number]
    )
  ) {
    throwBadRequest(
      "Only a moderated or public Risk Report can be linked to a Provider"
    );
  }
};

const expireIncidentInTransaction = async ({
  database,
  incidentId,
  now,
}: {
  database: Database;
  incidentId: string;
  now: Date;
}): Promise<ProviderRiskIncident | null> => {
  const row = await findIncident(database, incidentId);
  if (
    !row ||
    row.incident.status !== "AWAITING_PROVIDER_RESPONSE" ||
    now.getTime() < row.incident.responseDeadlineAt.getTime()
  ) {
    return null;
  }

  assertProviderRiskIncidentTransition(row.incident.status, "RESPONSE_EXPIRED");
  const [updated] = await database
    .update(protectionProviderRiskIncident)
    .set({ status: "RESPONSE_EXPIRED", updatedAt: now })
    .where(
      and(
        eq(protectionProviderRiskIncident.id, incidentId),
        eq(protectionProviderRiskIncident.status, "AWAITING_PROVIDER_RESPONSE")
      )
    )
    .returning();
  if (!updated) {
    return null;
  }

  await appendIncidentHistory(
    database,
    updated.id,
    "RESPONSE_EXPIRED",
    null,
    "Provider did not respond within the verified 48-hour window.",
    now
  );
  await publishProviderProfileStatusInTransaction({
    database,
    now,
    profileId: row.profile.id,
    reviewerUserId: null,
    status: "SUSPENDED_PENDING_REVIEW",
    statusReason:
      "Tạm ngưng để xem xét vì Provider không phản hồi trong thời hạn 48 giờ.",
  });
  await notifyProviderIncidentSuspended(database, updated, now);
  return updated;
};

export const expireProviderRiskIncidentResponses = async ({
  database,
  now = new Date(),
  providerUserId,
}: {
  database: Database;
  now?: Date;
  providerUserId?: string;
}) => {
  const conditions = [
    eq(protectionProviderRiskIncident.status, "AWAITING_PROVIDER_RESPONSE"),
    lte(protectionProviderRiskIncident.responseDeadlineAt, now),
  ];
  if (providerUserId) {
    conditions.push(
      eq(protectionProviderRiskIncident.providerUserId, providerUserId)
    );
  }
  const due = await database
    .select({ id: protectionProviderRiskIncident.id })
    .from(protectionProviderRiskIncident)
    .where(and(...conditions))
    .execute();
  let expiredCount = 0;
  for (const { id } of due) {
    const expired = await database.transaction((transaction) =>
      expireIncidentInTransaction({
        database: transaction,
        incidentId: id,
        now,
      })
    );
    if (expired) {
      expiredCount += 1;
    }
  }
  return { expiredCount };
};

export const linkRiskReportToProvider = async ({
  database,
  now = new Date(),
  profileId,
  profileVersionId,
  reason,
  reportId,
  reviewerUserId,
}: ProviderRiskIncidentLinkInput & {
  database: Database;
  now?: Date;
  reviewerUserId: string;
}) => {
  const incident = await database.transaction(async (transaction) => {
    const [report] = await transaction
      .select()
      .from(protectionRiskReport)
      .where(eq(protectionRiskReport.id, reportId))
      .limit(1);
    if (!report) {
      throw new ORPCError("NOT_FOUND", { message: "Risk report not found" });
    }
    validateIncidentReportStatus(report.status);

    const [profile] = await transaction
      .select()
      .from(protectionProviderProfile)
      .where(eq(protectionProviderProfile.id, profileId))
      .limit(1);
    if (!profile) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider profile does not exist",
      });
    }
    if (["REMOVED_FOR_FRAUD", "WITHDRAWN"].includes(profile.status)) {
      throwBadRequest(
        "A withdrawn or removed Provider profile cannot receive a new incident"
      );
    }

    const [profileVersion] = profileVersionId
      ? await transaction
          .select()
          .from(protectionProviderProfileVersion)
          .where(
            and(
              eq(protectionProviderProfileVersion.id, profileVersionId),
              eq(protectionProviderProfileVersion.profileId, profileId)
            )
          )
          .limit(1)
      : await transaction
          .select()
          .from(protectionProviderProfileVersion)
          .where(eq(protectionProviderProfileVersion.profileId, profileId))
          .orderBy(desc(protectionProviderProfileVersion.versionNumber))
          .limit(1);
    if (!profileVersion) {
      throw new ORPCError("CONFLICT", {
        message: "Provider profile has no authoritative version",
      });
    }

    const [existing] = await transaction
      .select()
      .from(protectionProviderRiskIncident)
      .where(
        and(
          eq(protectionProviderRiskIncident.riskReportId, reportId),
          eq(protectionProviderRiskIncident.providerProfileId, profileId)
        )
      )
      .limit(1);
    if (existing) {
      throw new ORPCError("CONFLICT", {
        message: "This Risk Report is already linked to the Provider",
      });
    }

    const responseDeadlineAt = getProviderRiskResponseDeadline(now);
    const [created] = await transaction
      .insert(protectionProviderRiskIncident)
      .values({
        createdAt: now,
        noticeVerifiedAt: now,
        providerProfileId: profile.id,
        providerProfileVersionId: profileVersion.id,
        providerUserId: profile.providerUserId,
        responseDeadlineAt,
        riskReportId: report.id,
        status: "AWAITING_PROVIDER_RESPONSE",
        updatedAt: now,
      })
      .returning();
    if (!created) {
      throw new ORPCError("CONFLICT", {
        message: "Provider incident could not be created",
      });
    }

    await appendIncidentHistory(
      transaction,
      created.id,
      created.status,
      reviewerUserId,
      reason?.trim() || "Verified Provider-linked Risk Report.",
      now
    );
    await notifyProviderIncidentRelatedReport(transaction, created, now);
    await notifyProviderIncidentDeadline(transaction, created, now);
    return created;
  });

  const result = await findIncident(database, incident.id);
  if (!result) {
    throw new ORPCError("CONFLICT", {
      message: "Provider incident could not be loaded after creation",
    });
  }
  return toAdminIncidentView(
    result,
    await findIncidentMaterials(database, incident.id)
  );
};

export const listProviderRiskIncidentsForAdmin = async (
  database: Database,
  input?: {
    profileId?: string;
    reportId?: string;
    status?: ProviderRiskIncident["status"];
  }
) => {
  const conditions: SQL[] = [];
  if (input?.profileId) {
    conditions.push(
      eq(protectionProviderRiskIncident.providerProfileId, input.profileId)
    );
  }
  if (input?.status) {
    conditions.push(eq(protectionProviderRiskIncident.status, input.status));
  }
  if (input?.reportId) {
    conditions.push(
      eq(protectionProviderRiskIncident.riskReportId, input.reportId)
    );
  }
  const incidents = await database
    .select({ id: protectionProviderRiskIncident.id })
    .from(protectionProviderRiskIncident)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(protectionProviderRiskIncident.createdAt))
    .execute();

  const views = [];
  for (const incident of incidents) {
    const row = await findIncident(database, incident.id);
    if (!row) {
      continue;
    }
    views.push(
      toAdminIncidentView(
        row,
        await findIncidentMaterials(database, incident.id)
      )
    );
  }
  return views;
};

export const getProviderRiskIncidentForAdmin = async (
  database: Database,
  incidentId: string
) => {
  const row = await findIncident(database, incidentId);
  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider incident does not exist",
    });
  }
  return toAdminIncidentView(
    row,
    await findIncidentMaterials(database, incidentId)
  );
};

export const listProviderRiskIncidentCandidates = async (
  database: Database,
  input?: { search?: string }
) => {
  const profiles = await database
    .select()
    .from(protectionProviderProfile)
    .orderBy(asc(protectionProviderProfile.displayName))
    .execute();
  const normalizedSearch = input?.search?.trim().toLowerCase();
  const candidates = [];
  for (const profile of profiles) {
    const [version] = await database
      .select()
      .from(protectionProviderProfileVersion)
      .where(eq(protectionProviderProfileVersion.profileId, profile.id))
      .orderBy(desc(protectionProviderProfileVersion.versionNumber))
      .limit(1);
    if (!version) {
      continue;
    }
    const searchable = [
      profile.displayName,
      profile.profileSlug,
      profile.providerUserId,
      version.services,
    ]
      .join(" ")
      .toLowerCase();
    if (normalizedSearch && !searchable.includes(normalizedSearch)) {
      continue;
    }
    candidates.push({
      displayName: version.displayName,
      id: profile.id,
      profileSlug: version.profileSlug,
      providerUserId: profile.providerUserId,
      services: version.services,
      status: profile.status,
      versionId: version.id,
      versionNumber: version.versionNumber,
    });
  }
  return candidates;
};

export const listProviderRiskIncidentsForProvider = async ({
  database,
  now = new Date(),
  providerUserId,
}: {
  database: Database;
  now?: Date;
  providerUserId: string;
}) => {
  await expireProviderRiskIncidentResponses({ database, now, providerUserId });
  const incidents = await database
    .select({ id: protectionProviderRiskIncident.id })
    .from(protectionProviderRiskIncident)
    .where(eq(protectionProviderRiskIncident.providerUserId, providerUserId))
    .orderBy(desc(protectionProviderRiskIncident.createdAt))
    .execute();
  const views = [];
  for (const incident of incidents) {
    const row = await findIncident(database, incident.id);
    if (!row || row.incident.providerUserId !== providerUserId) {
      continue;
    }
    views.push(
      toProviderIncidentView(
        row,
        await findIncidentMaterials(database, incident.id)
      )
    );
  }
  return views;
};

export const getProviderRiskIncidentForProvider = async ({
  database,
  incidentId,
  providerUserId,
}: {
  database: Database;
  incidentId: string;
  providerUserId: string;
}) => {
  const row = await findIncident(database, incidentId);
  if (!row || row.incident.providerUserId !== providerUserId) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider incident does not exist",
    });
  }
  return toProviderIncidentView(
    row,
    await findIncidentMaterials(database, incidentId)
  );
};

export const submitProviderRiskIncidentResponse = async ({
  database,
  incidentId,
  now = new Date(),
  providerUserId,
  response,
}: ProviderRiskIncidentResponseInput & {
  database: Database;
  now?: Date;
  providerUserId: string;
}) => {
  const result = await database.transaction(async (transaction) => {
    const row = await findIncident(transaction, incidentId);
    if (!row || row.incident.providerUserId !== providerUserId) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider incident does not exist",
      });
    }
    if (row.incident.status !== "AWAITING_PROVIDER_RESPONSE") {
      throwBadRequest(
        "This Provider incident is no longer accepting a response"
      );
    }
    if (!isProviderRiskResponseOpen({ incident: row.incident, now })) {
      await expireIncidentInTransaction({
        database: transaction,
        incidentId,
        now,
      });
      return { expired: true } as const;
    }

    assertProviderRiskIncidentTransition(
      row.incident.status,
      "PROVIDER_RESPONDED"
    );
    const [updated] = await transaction
      .update(protectionProviderRiskIncident)
      .set({
        providerRespondedAt: now,
        providerResponse: response.trim(),
        status: "PROVIDER_RESPONDED",
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionProviderRiskIncident.id, incidentId),
          eq(
            protectionProviderRiskIncident.status,
            "AWAITING_PROVIDER_RESPONSE"
          )
        )
      )
      .returning();
    if (!updated) {
      throw new ORPCError("CONFLICT", {
        message: "Provider incident changed while saving the response",
      });
    }
    await appendIncidentHistory(
      transaction,
      updated.id,
      updated.status,
      providerUserId,
      "Provider submitted a private response.",
      now
    );
    return { expired: false } as const;
  });

  if (result.expired) {
    throw new ORPCError("CONFLICT", {
      message:
        "The 48-hour response window has expired. The profile is suspended pending review; this is not an automatic fraud conclusion.",
    });
  }
  return getProviderRiskIncidentForProvider({
    database,
    incidentId,
    providerUserId,
  });
};

const assertProviderIncidentEvidenceInput = ({
  contentType,
  fileName,
  sizeBytes,
}: Pick<
  ProviderRiskIncidentEvidenceInput,
  "contentType" | "fileName" | "sizeBytes"
> & {
  incidentId: string;
  providerUserId: string;
}): void => {
  if (
    !RISK_REPORT_EVIDENCE_CONTENT_TYPES.includes(
      contentType as (typeof RISK_REPORT_EVIDENCE_CONTENT_TYPES)[number]
    )
  ) {
    throwBadRequest("This Provider evidence file type is not supported");
  }
  if (sizeBytes > RISK_REPORT_EVIDENCE_MAX_BYTES) {
    throwBadRequest("This Provider evidence file is too large");
  }
  if (!isRiskReportEvidenceFileNameAllowed(fileName, contentType)) {
    throwBadRequest("The evidence file name does not match its content type");
  }
};

export const registerProviderRiskIncidentEvidence = async ({
  database,
  incidentId,
  now = new Date(),
  providerUserId,
  ...input
}: ProviderRiskIncidentEvidenceInput & {
  database: Database;
  now?: Date;
  providerUserId: string;
}) => {
  assertProviderIncidentEvidenceInput({
    ...input,
    incidentId,
    providerUserId,
  });
  if (
    !isProviderRiskIncidentEvidenceKey(
      input.originalStorageKey,
      incidentId,
      providerUserId
    )
  ) {
    throwBadRequest("The Provider evidence storage key is not valid");
  }

  const result = await database.transaction(async (transaction) => {
    const row = await findIncident(transaction, incidentId);
    if (!row || row.incident.providerUserId !== providerUserId) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider incident does not exist",
      });
    }
    if (!isProviderRiskResponseOpen({ incident: row.incident, now })) {
      if (row.incident.status === "AWAITING_PROVIDER_RESPONSE") {
        await expireIncidentInTransaction({
          database: transaction,
          incidentId,
          now,
        });
        return { expired: true } as const;
      }
      throw new ORPCError("CONFLICT", {
        message: "The 48-hour response window has expired",
      });
    }
    const existing = await transaction
      .select({ id: protectionProviderRiskIncidentEvidence.id })
      .from(protectionProviderRiskIncidentEvidence)
      .where(eq(protectionProviderRiskIncidentEvidence.incidentId, incidentId))
      .execute();
    if (existing.length >= RISK_REPORT_EVIDENCE_MAX_COUNT) {
      throwBadRequest(
        `A Provider incident can contain at most ${RISK_REPORT_EVIDENCE_MAX_COUNT} evidence files`
      );
    }

    const [created] = await transaction
      .insert(protectionProviderRiskIncidentEvidence)
      .values({
        contentType: input.contentType,
        createdAt: now,
        fileName: input.fileName,
        immutableAt: now,
        incidentId,
        kind: input.kind,
        originalStorageKey: input.originalStorageKey,
        scanStatus: "PENDING",
        sha256: input.sha256,
        sizeBytes: input.sizeBytes,
      })
      .returning();
    if (!created) {
      throw new ORPCError("CONFLICT", {
        message: "Provider evidence could not be registered",
      });
    }
    return { created, expired: false } as const;
  });

  if (result.expired) {
    throw new ORPCError("CONFLICT", {
      message:
        "The 48-hour response window has expired. The profile is suspended pending review.",
    });
  }
  return toProviderEvidenceView(result.created);
};

export const assertProviderRiskIncidentEvidenceUploadAccess = async ({
  database,
  files,
  incidentId,
  now = new Date(),
  providerUserId,
}: {
  database: Database;
  files: readonly { size?: number; type: string }[];
  incidentId: string;
  now?: Date;
  providerUserId: string;
}): Promise<void> => {
  const [incident] = await database
    .select()
    .from(protectionProviderRiskIncident)
    .where(
      and(
        eq(protectionProviderRiskIncident.id, incidentId),
        eq(protectionProviderRiskIncident.providerUserId, providerUserId)
      )
    )
    .limit(1);
  if (!incident) {
    throw new ORPCError("NOT_FOUND", {
      message: "Provider incident does not exist",
    });
  }
  if (!isProviderRiskResponseOpen({ incident, now })) {
    throw new ORPCError("CONFLICT", {
      message: "The 48-hour response window has expired",
    });
  }
  const existing = await database
    .select({ id: protectionProviderRiskIncidentEvidence.id })
    .from(protectionProviderRiskIncidentEvidence)
    .where(eq(protectionProviderRiskIncidentEvidence.incidentId, incidentId))
    .execute();
  if (existing.length + files.length > RISK_REPORT_EVIDENCE_MAX_COUNT) {
    throw new ORPCError("BAD_REQUEST", {
      message: `A Provider incident can contain at most ${RISK_REPORT_EVIDENCE_MAX_COUNT} evidence files`,
    });
  }
  for (const file of files) {
    if (
      !RISK_REPORT_EVIDENCE_CONTENT_TYPES.includes(
        file.type as (typeof RISK_REPORT_EVIDENCE_CONTENT_TYPES)[number]
      ) ||
      (file.size !== undefined && file.size > RISK_REPORT_EVIDENCE_MAX_BYTES)
    ) {
      throw new ORPCError("BAD_REQUEST", {
        message: "This Provider evidence file type or size is not supported",
      });
    }
  }
};

export const reviewProviderRiskIncident = async ({
  database,
  incidentId,
  now = new Date(),
  reason,
  reviewerUserId,
  status,
}: ProviderRiskIncidentReviewInput & {
  database: Database;
  now?: Date;
  reviewerUserId: string;
}) => {
  await database.transaction(async (transaction) => {
    const row = await findIncident(transaction, incidentId);
    if (!row) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider incident does not exist",
      });
    }
    assertProviderRiskIncidentTransition(row.incident.status, status);
    const [updated] = await transaction
      .update(protectionProviderRiskIncident)
      .set({
        reviewReason: reason.trim(),
        reviewedAt: now,
        reviewedByUserId: reviewerUserId,
        status,
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionProviderRiskIncident.id, incidentId),
          eq(protectionProviderRiskIncident.status, row.incident.status)
        )
      )
      .returning();
    if (!updated) {
      throw new ORPCError("CONFLICT", {
        message: "Provider incident changed while being reviewed",
      });
    }
    await appendIncidentHistory(
      transaction,
      updated.id,
      updated.status,
      reviewerUserId,
      reason.trim(),
      now
    );
    if (
      status === "DISMISSED" &&
      row.profile.status === "SUSPENDED_PENDING_REVIEW"
    ) {
      await publishProviderProfileStatusInTransaction({
        database: transaction,
        now,
        profileId: row.profile.id,
        reviewerUserId,
        status: "ACTIVE",
        statusReason: "Provider incident dismissed after review.",
      });
    }
  });
  return getProviderRiskIncidentForAdmin(database, incidentId);
};

export const confirmProviderRiskIncidentFraud = async ({
  database,
  incidentId,
  now = new Date(),
  reason,
  reviewerUserId,
}: {
  database: Database;
  incidentId: string;
  now?: Date;
  reason: string;
  reviewerUserId: string;
}) => {
  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    throwBadRequest(
      "An explicit reason is required to confirm intentional fraud"
    );
  }

  await database.transaction(async (transaction) => {
    const row = await findIncident(transaction, incidentId);
    if (!row) {
      throw new ORPCError("NOT_FOUND", {
        message: "Provider incident does not exist",
      });
    }
    assertProviderRiskIncidentTransition(
      row.incident.status,
      "CONFIRMED_FRAUD"
    );
    const [updated] = await transaction
      .update(protectionProviderRiskIncident)
      .set({
        reviewReason: normalizedReason,
        reviewedAt: now,
        reviewedByUserId: reviewerUserId,
        status: "CONFIRMED_FRAUD",
        updatedAt: now,
      })
      .where(
        and(
          eq(protectionProviderRiskIncident.id, incidentId),
          eq(protectionProviderRiskIncident.status, row.incident.status)
        )
      )
      .returning();
    if (!updated) {
      throw new ORPCError("CONFLICT", {
        message: "Provider incident changed while confirming fraud",
      });
    }
    await appendIncidentHistory(
      transaction,
      updated.id,
      updated.status,
      reviewerUserId,
      normalizedReason,
      now
    );
    await publishProviderProfileStatusInTransaction({
      database: transaction,
      now,
      profileId: row.profile.id,
      reviewerUserId,
      status: "REMOVED_FOR_FRAUD",
      statusReason: normalizedReason,
    });
    await notifyProviderIncidentRemoved(transaction, updated, now);
  });

  return getProviderRiskIncidentForAdmin(database, incidentId);
};
