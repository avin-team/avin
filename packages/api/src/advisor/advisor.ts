import { createHash } from "node:crypto";

import {
  advisorAttachment,
  advisorPlaybook,
  advisorSession,
} from "@avin/db/schema/advisor";
import { listing, servicePackage, subCategory } from "@avin/db/schema/catalog";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, lte } from "drizzle-orm";
import { z } from "zod";

import { sellerIsNotEnforcedCondition } from "../listing/listing-discovery";
import type { Context } from "../runtime/context";
import type { ManagedObjectStore } from "../runtime/storage";
import {
  cleanupExpiredAdvisorAttachments,
  deleteAdvisorAttachmentObjects,
} from "./attachments";
import { advisorPlaybookContentSchema } from "./playbook";
import type { AdvisorPlaybookContent } from "./playbook";

export const ADVISOR_CONSENT_VERSION = "v1" as const;
export const ADVISOR_VISITOR_CAPABILITY_COOKIE = "avin_advisor_capability";
export const ADVISOR_VISITOR_SESSION_HOURS = 24;
export const ADVISOR_USER_SESSION_DAYS = 30;
export const ADVISOR_MAX_TURNS = 15;
export const ADVISOR_SERVICE_BROWSE_PATH = "/category";
export const ADVISOR_ALLOWED_READ_TOOLS = [
  "findPublicServiceListings",
  "getPublicListingDetails",
] as const;
const ADVISOR_SIGNAL_SELECTION_KEY = "__selectedSignal";
const ADVISOR_SIGNAL_SELECTION_QUESTION_ID = "__signal";

export const advisorReadToolCallSchema = z.discriminatedUnion("tool", [
  z.strictObject({
    input: z.strictObject({ subCategoryId: z.uuid() }),
    tool: z.literal("findPublicServiceListings"),
  }),
  z.strictObject({
    input: z.strictObject({ listingId: z.uuid() }),
    tool: z.literal("getPublicListingDetails"),
  }),
]);

export const advisorVisitorCapabilitySchema = z
  .string()
  .trim()
  .min(32)
  .max(256);

export const advisorConsentRecordInputSchema = z.strictObject({
  version: z.literal(ADVISOR_CONSENT_VERSION),
  visitorCapability: advisorVisitorCapabilitySchema.optional(),
});

export const advisorSessionCreateInputSchema = z.strictObject({
  consentId: z.uuid(),
  visitorCapability: advisorVisitorCapabilitySchema.optional(),
});

export const advisorSessionIdInputSchema = z.strictObject({
  sessionId: z.uuid(),
  visitorCapability: advisorVisitorCapabilitySchema.optional(),
});

export const advisorTurnInputSchema = z.strictObject({
  attachmentIds: z.array(z.uuid()).max(3).optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
  sessionId: z.uuid(),
  text: z.string().trim().min(1).max(5000),
  visitorCapability: advisorVisitorCapabilitySchema.optional(),
});

const advisorQuestionOptionSchema = z.strictObject({
  label: z.string().trim().min(1).max(160),
  value: z.string().trim().min(1).max(128),
});

export const advisorQuestionSchema = z.strictObject({
  allowFreeText: z.literal(true),
  id: z.string().trim().min(1).max(128).nullable(),
  options: z.array(advisorQuestionOptionSchema).max(8),
  prompt: z.string().trim().min(1).max(500),
});

const advisorRecommendationListingSchema = z.strictObject({
  completedOrderCount: z.number().int().nonnegative(),
  id: z.string().trim().min(1).max(128),
  listingPath: z.string().trim().min(1).max(300),
  priceAmount: z.number().int().nonnegative(),
  processingTimeHours: z.number().int().positive().nullable(),
  ratingCount: z.number().int().nonnegative(),
  ratingScore: z.number().nonnegative(),
  reasons: z.array(z.string().trim().min(1).max(240)).min(1).max(3),
  seller: z.strictObject({
    id: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(200),
  }),
  servicePackage: z
    .strictObject({
      id: z.string().trim().min(1).max(128),
      name: z.string().trim().min(1).max(200),
      priceAmount: z.number().int().positive(),
      processingTimeHours: z.number().int().positive(),
      warrantyPolicy: z.unknown(),
    })
    .nullable(),
  slug: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  warrantyPolicy: z.unknown().nullable(),
});

export const advisorRecommendationPayloadSchema = z.strictObject({
  isAiGenerated: z.literal(true),
  label: z.string().trim().min(1).max(120),
  listings: z.array(advisorRecommendationListingSchema).min(1).max(3),
  subCategoryId: z.uuid(),
  subCategoryName: z.string().trim().min(1).max(200),
});

export const advisorTurnResponseSchema = z.strictObject({
  browsePath: z.string().trim().min(1).max(400).nullable().default(null),
  completed: z.boolean(),
  kind: z.enum([
    "QUESTION",
    "RECOMMENDATION",
    "NO_MATCH",
    "PLAYBOOK_UNAVAILABLE",
    "STOPPED",
  ]),
  message: z.string().trim().min(1).max(2000),
  question: advisorQuestionSchema.nullable(),
  recommendation: advisorRecommendationPayloadSchema.nullable(),
});

export type AdvisorTurnResponse = z.infer<typeof advisorTurnResponseSchema>;
export type AdvisorSessionRecord = typeof advisorSession.$inferSelect;

type AdvisorDatabase = Context["db"];
interface PublishedPlaybook {
  content: Record<string, unknown>;
  id: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  subCategory: {
    id: string;
    name: string;
    parentCategory: {
      name: string;
      slug: string;
      status: "ACTIVE" | "HIDDEN" | "ARCHIVED";
    } | null;
    slug: string;
    status: "ACTIVE" | "HIDDEN" | "ARCHIVED";
  };
}
interface CatalogCandidate {
  category: {
    parentCategory: { status: "ACTIVE" | "HIDDEN" | "ARCHIVED" } | null;
    status: "ACTIVE" | "HIDDEN" | "ARCHIVED";
  } | null;
  completedOrderCount: number;
  description: string | null;
  id: string;
  priceAmount: number | null;
  processingTimeHours: number | null;
  ratingCount: number;
  ratingScore: string;
  seller: { id: string; name: string };
  sellerId: string;
  sellerProfile: { storefrontName: string | null } | null;
  servicePackages: {
    description?: string;
    id: string;
    name: string;
    priceAmount: number;
    processingTimeHours: number;
    warrantyPolicy: unknown;
  }[];
  slug: string;
  title: string | null;
}

interface ActiveTaxonomySubCategory {
  id: string;
  name: string;
  parentCategory: {
    name: string;
    slug: string;
    status: "ACTIVE" | "HIDDEN" | "ARCHIVED";
  } | null;
  slug: string;
  status: "ACTIVE" | "HIDDEN" | "ARCHIVED";
}

export interface AdvisorTurnComputation {
  answers: Record<string, string>;
  pendingQuestionId: string | null;
  pinnedPlaybookId: string | null;
  pinnedSubCategoryId: string | null;
  response: AdvisorTurnResponse;
  serviceNeed: string;
}

const normalizeText = (value: string): string =>
  value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("vi-VN")
    .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const includesKeyword = (text: string, keyword: string): boolean => {
  const normalizedKeyword = normalizeText(keyword);
  return normalizedKeyword.length > 0 && text.includes(normalizedKeyword);
};

export const hashVisitorCapability = (capability: string): string =>
  createHash("sha256").update(capability).digest("hex");

export const getAdvisorSubject = (
  context: Pick<Context, "session">,
  visitorCapability: string | undefined
): { userId: string | null; visitorCapabilityHash: string | null } => {
  if (context.session?.user.id) {
    return {
      userId: context.session.user.id,
      visitorCapabilityHash: null,
    };
  }

  if (!visitorCapability) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "An Advisor session capability is required for visitors.",
    });
  }

  return {
    userId: null,
    visitorCapabilityHash: hashVisitorCapability(visitorCapability),
  };
};

export const isAdvisorConsentOwnedBy = (
  consent: {
    userId: string | null;
    visitorCapabilityHash: string | null;
  },
  subject: { userId: string | null; visitorCapabilityHash: string | null }
): boolean =>
  (subject.userId !== null && consent.userId === subject.userId) ||
  (subject.visitorCapabilityHash !== null &&
    consent.visitorCapabilityHash === subject.visitorCapabilityHash);

export const getAdvisorSessionExpiry = (
  now: Date,
  subject: { userId: string | null }
): Date => {
  const expiry = new Date(now);
  if (subject.userId) {
    expiry.setTime(
      expiry.getTime() + ADVISOR_USER_SESSION_DAYS * 24 * 60 * 60 * 1000
    );
  } else {
    expiry.setTime(
      expiry.getTime() + ADVISOR_VISITOR_SESSION_HOURS * 60 * 60 * 1000
    );
  }
  return expiry;
};

const ADVISOR_SESSION_CLEANUP_LIMIT = 100;

export interface CleanupExpiredAdvisorSessionsOptions {
  database: AdvisorDatabase;
  limit?: number;
  now?: Date;
  storage?: ManagedObjectStore;
}

export const cleanupExpiredAdvisorSessions = async ({
  database,
  limit = ADVISOR_SESSION_CLEANUP_LIMIT,
  now = new Date(),
  storage,
}: CleanupExpiredAdvisorSessionsOptions): Promise<number> => {
  await cleanupExpiredAdvisorAttachments({ database, now, storage });
  const expiredSessions = await database.query.advisorSession.findMany({
    columns: { id: true },
    limit,
    where: lte(advisorSession.expiresAt, now),
  });

  const deletedCounts = await Promise.all(
    expiredSessions.map(async (session) => {
      const attachments =
        (await database.query.advisorAttachment.findMany({
          where: eq(advisorAttachment.sessionId, session.id),
        })) ?? [];
      await deleteAdvisorAttachmentObjects({ attachments, storage });
      const [deleted] = await database
        .delete(advisorSession)
        .where(
          and(
            eq(advisorSession.id, session.id),
            lte(advisorSession.expiresAt, now)
          )
        )
        .returning({ id: advisorSession.id });
      return deleted ? 1 : 0;
    })
  );

  return deletedCounts.reduce<number>((total, count) => total + count, 0);
};

const getSubCategoryBrowsePath = ({
  parentCategory,
  slug,
}: {
  parentCategory: { slug: string } | null;
  slug: string;
}): string =>
  parentCategory
    ? `/category/${encodeURIComponent(parentCategory.slug)}?subSlug=${encodeURIComponent(slug)}`
    : ADVISOR_SERVICE_BROWSE_PATH;

const getPlaybookBrowsePath = (playbook: PublishedPlaybook): string =>
  getSubCategoryBrowsePath({
    parentCategory: playbook.subCategory.parentCategory,
    slug: playbook.subCategory.slug,
  });

const parsePlaybookContent = (
  playbook: PublishedPlaybook
): AdvisorPlaybookContent | null => {
  const parsed = advisorPlaybookContentSchema.safeParse(playbook.content);
  return parsed.success ? parsed.data : null;
};

const loadPublishedPlaybooks = async (
  database: AdvisorDatabase
): Promise<PublishedPlaybook[]> => {
  const rows = await database.query.advisorPlaybook.findMany({
    where: eq(advisorPlaybook.status, "PUBLISHED"),
    with: {
      subCategory: { with: { parentCategory: true } },
    },
  });

  const typedRows = rows as unknown as PublishedPlaybook[];
  return typedRows.filter(
    (row) =>
      row.status === "PUBLISHED" &&
      row.subCategory?.status === "ACTIVE" &&
      row.subCategory.parentCategory?.status === "ACTIVE" &&
      parsePlaybookContent(row) !== null
  );
};

const loadPlaybookById = async (
  database: AdvisorDatabase,
  playbookId: string
): Promise<PublishedPlaybook | null> => {
  const playbook = await database.query.advisorPlaybook.findFirst?.({
    where: eq(advisorPlaybook.id, playbookId),
    with: {
      subCategory: { with: { parentCategory: true } },
    },
  });
  return (playbook as unknown as PublishedPlaybook | null) ?? null;
};

const isUsablePinnedPlaybook = (
  playbook: PublishedPlaybook | null
): playbook is PublishedPlaybook =>
  Boolean(
    playbook &&
    playbook.status === "PUBLISHED" &&
    playbook.subCategory.status === "ACTIVE" &&
    playbook.subCategory.parentCategory?.status === "ACTIVE" &&
    parsePlaybookContent(playbook)
  );

const getPlaybookSearchText = (
  playbook: PublishedPlaybook,
  content: AdvisorPlaybookContent
): string[] => [
  playbook.subCategory.name,
  playbook.subCategory.slug,
  playbook.subCategory.parentCategory?.name ?? "",
  playbook.subCategory.parentCategory?.slug ?? "",
  ...content.needSignals.flatMap((signal) => signal.keywords),
];

const getPlaybookMatches = (
  playbooks: readonly PublishedPlaybook[],
  text: string
): {
  content: AdvisorPlaybookContent;
  matchedSignalIds: string[];
  playbook: PublishedPlaybook;
  score: number;
}[] => {
  const normalizedText = normalizeText(text);
  return playbooks.flatMap((playbook) => {
    const content = parsePlaybookContent(playbook);
    if (!content) {
      return [];
    }

    const matchedSignals = content.needSignals.filter((signal) =>
      signal.keywords.some((keyword) =>
        includesKeyword(normalizedText, keyword)
      )
    );
    const categoryMatch = getPlaybookSearchText(playbook, content)
      .slice(0, 4)
      .some((keyword) => includesKeyword(normalizedText, keyword));
    if (matchedSignals.length === 0 && !categoryMatch) {
      return [];
    }

    return [
      {
        content,
        matchedSignalIds: matchedSignals.map((signal) => signal.id),
        playbook,
        score: matchedSignals.length + (categoryMatch ? 1 : 0),
      },
    ];
  });
};

const makeQuestion = (
  question: AdvisorPlaybookContent["clarificationQuestions"][number]
): NonNullable<AdvisorTurnResponse["question"]> => ({
  allowFreeText: true,
  id: question.id,
  options: question.answerOptions,
  prompt: question.prompt,
});

const makeRoutingQuestion = (
  matches: readonly {
    playbook: PublishedPlaybook;
  }[]
): NonNullable<AdvisorTurnResponse["question"]> => ({
  allowFreeText: true,
  id: null,
  options: matches.slice(0, 8).map(({ playbook }) => ({
    label: playbook.subCategory.name,
    value: playbook.subCategory.id,
  })),
  prompt:
    "Mình thấy nhu cầu này có thể thuộc nhiều nhóm. Bạn muốn ưu tiên nhóm nào?",
});

const buildNoMatchResponse = (
  message: string,
  browsePath = ADVISOR_SERVICE_BROWSE_PATH,
  kind: "NO_MATCH" | "PLAYBOOK_UNAVAILABLE" = "NO_MATCH"
): AdvisorTurnResponse => ({
  browsePath,
  completed: false,
  kind,
  message,
  question: null,
  recommendation: null,
});

const getAnswerValue = (
  question: AdvisorPlaybookContent["clarificationQuestions"][number],
  text: string
): string => {
  const normalized = normalizeText(text);
  const option = question.answerOptions.find(
    (candidate) =>
      includesKeyword(normalized, candidate.value) ||
      includesKeyword(normalized, candidate.label)
  );
  return option?.value ?? text.trim();
};

const getMissingRequiredQuestion = (
  content: AdvisorPlaybookContent,
  answers: Readonly<Record<string, string>>
) =>
  content.completionRequirements.requiredQuestionIds
    .map((questionId) =>
      content.clarificationQuestions.find(
        (question) => question.id === questionId
      )
    )
    .find((question) => question && !answers[question.id]?.trim());

const getMatchedSignals = (content: AdvisorPlaybookContent, text: string) => {
  const normalizedText = normalizeText(text);
  return content.needSignals.filter((signal) =>
    signal.keywords.some((keyword) => includesKeyword(normalizedText, keyword))
  );
};

const getMatchedExclusion = (content: AdvisorPlaybookContent, text: string) => {
  const normalizedText = normalizeText(text);
  return content.exclusionConditions.find((condition) =>
    condition.keywords.some((keyword) =>
      includesKeyword(normalizedText, keyword)
    )
  );
};

interface AdvisorRankingSignals {
  budgetCeiling: number | null;
  maxProcessingHours: number | null;
}

interface RankedCandidate {
  candidate: CatalogCandidate;
  packageItem: CatalogCandidate["servicePackages"][number] | null;
  ranking: {
    budget: number;
    fit: number;
    packageScope: number;
    timing: number;
  };
}

const parseVndAmount = (raw: string, unit: string | undefined): number => {
  let normalizedRaw = raw.replace(",", ".");
  if (raw.includes(".") && raw.includes(",")) {
    normalizedRaw = raw.replaceAll(".", "").replace(",", ".");
  } else if (raw.includes(".") && raw.split(".").at(-1)?.length === 3) {
    normalizedRaw = raw.replaceAll(".", "");
  }
  const value = Number(normalizedRaw);
  const normalizedUnit = normalizeText(unit ?? "");
  if (
    normalizedUnit === "k" ||
    normalizedUnit === "nghin" ||
    normalizedUnit === "ngan"
  ) {
    return value * 1000;
  }
  if (
    normalizedUnit === "m" ||
    normalizedUnit === "tr" ||
    normalizedUnit === "trieu"
  ) {
    return value * 1_000_000;
  }
  return value;
};

const getAdvisorRankingSignals = (
  serviceNeed: string
): AdvisorRankingSignals => {
  const budgetMatch =
    /(?:under|below|up to|<=|dưới|tối đa)\s*(?<amount>[\d.,]+)\s*(?<unit>k|nghìn|ngàn|m|tr|triệu)?/iu.exec(
      serviceNeed
    );
  const durationMatch =
    /(?:within|under|trong|tối đa|trước)?\s*(?<value>\d+)\s*(?<unit>h|hour(?:s)?|giờ|day(?:s)?|ngày)/iu.exec(
      serviceNeed
    );
  const durationUnit = normalizeText(durationMatch?.groups?.unit ?? "");
  const durationMultiplier =
    durationUnit === "day" || durationUnit === "days" || durationUnit === "ngay"
      ? 24
      : 1;
  return {
    budgetCeiling: budgetMatch?.groups?.amount
      ? parseVndAmount(budgetMatch.groups.amount, budgetMatch.groups.unit)
      : null,
    maxProcessingHours: durationMatch?.groups?.value
      ? Number(durationMatch.groups.value) * durationMultiplier
      : null,
  };
};

const getNeedTokens = (serviceNeed: string): Set<string> =>
  new Set(
    normalizeText(serviceNeed)
      .split(" ")
      .filter((token) => token.length >= 3)
  );

const getPackageScopeScore = (
  packageItem: CatalogCandidate["servicePackages"][number],
  needTokens: ReadonlySet<string>
): number => {
  const packageText = normalizeText(
    `${packageItem.name} ${packageItem.description ?? ""}`
  );
  return [...needTokens].filter((token) => packageText.includes(token)).length;
};

const getCandidateFitScore = (
  candidate: CatalogCandidate,
  serviceNeed: string
): number => {
  const candidateText = normalizeText(
    `${candidate.title ?? ""} ${candidate.description ?? ""} ${candidate.servicePackages
      .map(
        (packageItem) => `${packageItem.name} ${packageItem.description ?? ""}`
      )
      .join(" ")}`
  );
  return [...getNeedTokens(serviceNeed)].filter((token) =>
    candidateText.includes(token)
  ).length;
};

const getConstraintScore = (value: number, limit: number | null): number => {
  if (limit === null) {
    return 0;
  }
  return value <= limit ? 1 : 0;
};

const getPreferredPackage = (
  candidate: CatalogCandidate,
  serviceNeed: string,
  signals: AdvisorRankingSignals
): RankedCandidate["packageItem"] => {
  const needTokens = getNeedTokens(serviceNeed);
  return (
    candidate.servicePackages.toSorted((left, right) => {
      const leftScope = getPackageScopeScore(left, needTokens);
      const rightScope = getPackageScopeScore(right, needTokens);
      if (rightScope !== leftScope) {
        return rightScope - leftScope;
      }
      const leftBudget = getConstraintScore(
        left.priceAmount,
        signals.budgetCeiling
      );
      const rightBudget = getConstraintScore(
        right.priceAmount,
        signals.budgetCeiling
      );
      if (rightBudget !== leftBudget) {
        return rightBudget - leftBudget;
      }
      const leftTiming = getConstraintScore(
        left.processingTimeHours,
        signals.maxProcessingHours
      );
      const rightTiming = getConstraintScore(
        right.processingTimeHours,
        signals.maxProcessingHours
      );
      if (rightTiming !== leftTiming) {
        return rightTiming - leftTiming;
      }
      return left.priceAmount - right.priceAmount;
    })[0] ?? null
  );
};

const rankCandidate = (
  candidate: CatalogCandidate,
  serviceNeed: string,
  signals: AdvisorRankingSignals
): RankedCandidate => {
  const packageItem = getPreferredPackage(candidate, serviceNeed, signals);
  const packageScope = packageItem
    ? getPackageScopeScore(packageItem, getNeedTokens(serviceNeed))
    : 0;
  return {
    candidate,
    packageItem,
    ranking: {
      budget: packageItem
        ? getConstraintScore(packageItem.priceAmount, signals.budgetCeiling)
        : 0,
      fit: getCandidateFitScore(candidate, serviceNeed),
      packageScope,
      timing: packageItem
        ? getConstraintScore(
            packageItem.processingTimeHours,
            signals.maxProcessingHours
          )
        : 0,
    },
  };
};

const buildRecommendation = ({
  candidates,
  playbook,
  serviceNeed,
}: {
  candidates: readonly CatalogCandidate[];
  playbook: PublishedPlaybook;
  serviceNeed: string;
}): AdvisorTurnResponse["recommendation"] => {
  const signals = getAdvisorRankingSignals(serviceNeed);
  const ranked = candidates
    .map((candidate) => rankCandidate(candidate, serviceNeed, signals))
    .toSorted((left, right) => {
      for (const key of ["fit", "packageScope", "budget", "timing"] as const) {
        const difference = right.ranking[key] - left.ranking[key];
        if (difference !== 0) {
          return difference;
        }
      }

      const ratingDifference =
        Number(right.candidate.ratingScore) -
        Number(left.candidate.ratingScore);
      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      return (
        right.candidate.completedOrderCount - left.candidate.completedOrderCount
      );
    });

  const diversified: RankedCandidate[] = [];
  const sellers = new Set<string>();
  for (const candidate of ranked) {
    if (!sellers.has(candidate.candidate.sellerId)) {
      diversified.push(candidate);
      sellers.add(candidate.candidate.sellerId);
    }
    if (diversified.length === 3) {
      break;
    }
  }
  if (diversified.length < 3) {
    for (const candidate of ranked) {
      if (
        !diversified.some(
          (item) => item.candidate.id === candidate.candidate.id
        )
      ) {
        diversified.push(candidate);
      }
      if (diversified.length === 3) {
        break;
      }
    }
  }

  const sellerCounts = new Map<string, number>();
  for (const { candidate } of diversified) {
    sellerCounts.set(
      candidate.sellerId,
      (sellerCounts.get(candidate.sellerId) ?? 0) + 1
    );
  }

  return {
    isAiGenerated: true,
    label: "Gợi ý do AI tạo",
    listings: diversified.map(({ candidate, packageItem }) => {
      const title = candidate.title?.trim() || "Dịch vụ trên Avin";
      const sellerName =
        candidate.sellerProfile?.storefrontName ?? candidate.seller.name;
      const reasons = [`Phù hợp với nhóm ${playbook.subCategory.name}.`];
      if ((sellerCounts.get(candidate.sellerId) ?? 0) > 1) {
        reasons.push(
          "Có nhiều Listing cùng Seller vì chưa đủ lựa chọn phù hợp từ Seller khác."
        );
      }
      reasons.push(
        "Listing đang công khai và có thể mua tại thời điểm tư vấn."
      );
      if (packageItem) {
        reasons.push(`Gợi ý xem gói ${packageItem.name} trước khi đặt.`);
      }

      return {
        completedOrderCount: candidate.completedOrderCount,
        id: candidate.id,
        listingPath: `/listing/${candidate.slug}`,
        priceAmount: packageItem?.priceAmount ?? candidate.priceAmount ?? 0,
        processingTimeHours:
          packageItem?.processingTimeHours ?? candidate.processingTimeHours,
        ratingCount: candidate.ratingCount,
        ratingScore: Number(candidate.ratingScore),
        reasons: reasons.slice(0, 3),
        seller: { id: candidate.sellerId, name: sellerName },
        servicePackage: packageItem
          ? {
              id: packageItem.id,
              name: packageItem.name,
              priceAmount: packageItem.priceAmount,
              processingTimeHours: packageItem.processingTimeHours,
              warrantyPolicy: packageItem.warrantyPolicy,
            }
          : null,
        slug: candidate.slug,
        title,
        warrantyPolicy: packageItem?.warrantyPolicy ?? null,
      };
    }),
    subCategoryId: playbook.subCategory.id,
    subCategoryName: playbook.subCategory.name,
  };
};

export const revalidateAdvisorRecommendation = async ({
  database,
  recommendation,
}: {
  database: AdvisorDatabase;
  recommendation: z.infer<typeof advisorRecommendationPayloadSchema>;
}): Promise<Record<string, boolean>> => {
  const listingIds = recommendation.listings.map((item) => item.id);
  const liveListings = await database.query.listing.findMany({
    where: and(
      inArray(listing.id, listingIds),
      eq(listing.status, "PUBLISHED"),
      eq(listing.type, "SERVICE"),
      sellerIsNotEnforcedCondition()
    ),
    with: {
      category: { with: { parentCategory: true } },
      servicePackages: {
        columns: { id: true },
        where: eq(servicePackage.status, "AVAILABLE"),
      },
    },
  });
  const typedLiveListings = (liveListings ?? []) as unknown as {
    category: {
      parentCategory: { status: "ACTIVE" | "HIDDEN" | "ARCHIVED" } | null;
      status: "ACTIVE" | "HIDDEN" | "ARCHIVED";
    } | null;
    id: string;
    servicePackages: { id: string }[];
  }[];
  const liveById = new Map(
    typedLiveListings.map((liveListing) => [liveListing.id, liveListing])
  );

  return Object.fromEntries(
    recommendation.listings.map((item) => {
      const liveListing = liveById.get(item.id);
      const availablePackages = liveListing?.servicePackages ?? [];
      const categoryIsActive =
        liveListing?.category?.status === "ACTIVE" &&
        liveListing.category.parentCategory?.status === "ACTIVE";
      const packageIsAvailable = item.servicePackage
        ? availablePackages.some(
            (packageItem) => packageItem.id === item.servicePackage?.id
          )
        : availablePackages.length > 0;
      return [
        item.id,
        Boolean(liveListing && categoryIsActive && packageIsAvailable),
      ];
    })
  );
};

const findLiveCatalogCandidates = async ({
  database,
  serviceNeed,
  subCategoryId,
}: {
  database: AdvisorDatabase;
  serviceNeed: string;
  subCategoryId: string;
}): Promise<CatalogCandidate[]> => {
  const candidates = await database.query.listing.findMany({
    where: and(
      eq(listing.categoryId, subCategoryId),
      eq(listing.status, "PUBLISHED"),
      eq(listing.type, "SERVICE"),
      sellerIsNotEnforcedCondition()
    ),
    with: {
      category: { with: { parentCategory: true } },
      seller: { columns: { id: true, name: true } },
      sellerProfile: {
        columns: { storefrontName: true },
      },
      servicePackages: {
        where: eq(servicePackage.status, "AVAILABLE"),
      },
    },
  });

  const typedCandidates = (candidates ?? []) as unknown as CatalogCandidate[];
  return typedCandidates.filter(
    (candidate) =>
      candidate.category?.status === "ACTIVE" &&
      candidate.category.parentCategory?.status === "ACTIVE" &&
      candidate.servicePackages.length > 0 &&
      getCandidateFitScore(candidate, serviceNeed) >= 0
  );
};

const findReferencedListing = async ({
  database,
  text,
}: {
  database: AdvisorDatabase;
  text: string;
}): Promise<CatalogCandidate | null> => {
  const candidates = await database.query.listing.findMany({
    limit: 100,
    where: and(
      eq(listing.status, "PUBLISHED"),
      eq(listing.type, "SERVICE"),
      sellerIsNotEnforcedCondition()
    ),
    with: {
      category: { with: { parentCategory: true } },
      seller: { columns: { id: true, name: true } },
      sellerProfile: {
        columns: { storefrontName: true },
      },
      servicePackages: {
        where: eq(servicePackage.status, "AVAILABLE"),
      },
    },
  });
  const normalizedText = normalizeText(text);
  const typedCandidates = (candidates ?? []) as unknown as CatalogCandidate[];
  return (
    typedCandidates.find((candidate) => {
      if (
        candidate.category?.status !== "ACTIVE" ||
        candidate.category.parentCategory?.status !== "ACTIVE" ||
        candidate.servicePackages.length === 0
      ) {
        return false;
      }

      return [candidate.id, candidate.slug, candidate.title ?? ""]
        .map(normalizeText)
        .filter((value) => value.length >= 3)
        .some((value) => normalizedText.includes(value));
    }) ?? null
  );
};

const findActiveTaxonomyMatches = async (
  database: AdvisorDatabase,
  text: string
): Promise<ActiveTaxonomySubCategory[]> => {
  const rows = await database.query.subCategory?.findMany({
    where: eq(subCategory.status, "ACTIVE"),
    with: { parentCategory: true },
  });
  const normalizedText = normalizeText(text);
  const typedRows = (rows ?? []) as unknown as ActiveTaxonomySubCategory[];
  return typedRows.filter((row) => {
    if (row.status !== "ACTIVE" || row.parentCategory?.status !== "ACTIVE") {
      return false;
    }
    const taxonomyTerms = [row.name, row.slug]
      .flatMap((value) => normalizeText(value).split(" "))
      .filter((value) => value.length >= 3);
    return taxonomyTerms.some((term) => normalizedText.includes(term));
  });
};

const hasMultipleProblemMarkers = (text: string): boolean =>
  /[,;]/u.test(text) ||
  /\b(?:and|also|plus|va|con|them)\b/u.test(normalizeText(text));

const isCourseRequest = (text: string): boolean => {
  const normalizedText = normalizeText(text);
  return ["course", "courses", "khoa hoc", "lop hoc", "dao tao"].some(
    (keyword) => normalizedText.includes(keyword)
  );
};

const buildQuestionResponse = (
  question: NonNullable<AdvisorTurnResponse["question"]>,
  message: string
): AdvisorTurnResponse => ({
  browsePath: null,
  completed: false,
  kind: "QUESTION",
  message,
  question,
  recommendation: null,
});

// The state machine intentionally keeps routing, gate evaluation, and catalog
// revalidation in one transaction boundary for a single text turn.
// oxlint-disable-next-line complexity
export const orchestrateAdvisorTurn = async ({
  database,
  session,
  text,
}: {
  database: AdvisorDatabase;
  session: AdvisorSessionRecord;
  text: string;
}): Promise<AdvisorTurnComputation> => {
  const serviceNeed = session.serviceNeed.trim()
    ? `${session.serviceNeed.trim()} ${text.trim()}`
    : text.trim();
  const answers = { ...session.answers };
  let { pendingQuestionId } = session;
  let { pinnedPlaybookId } = session;
  let { pinnedSubCategoryId } = session;
  if (session.turnCount >= ADVISOR_MAX_TURNS) {
    return {
      answers,
      pendingQuestionId: null,
      pinnedPlaybookId,
      pinnedSubCategoryId,
      response: buildNoMatchResponse(
        `Phiên này đã đạt giới hạn ${ADVISOR_MAX_TURNS} lượt. Bạn có thể duyệt danh mục dịch vụ hoặc bắt đầu một phiên mới.`,
        ADVISOR_SERVICE_BROWSE_PATH
      ),
      serviceNeed,
    };
  }

  if (isCourseRequest(text)) {
    return {
      answers,
      pendingQuestionId: null,
      pinnedPlaybookId,
      pinnedSubCategoryId,
      response: buildNoMatchResponse(
        "Beta hiện chỉ hỗ trợ tìm Listing SERVICE; Advisor chưa tư vấn COURSE. Bạn có thể duyệt danh mục để tìm khóa học phù hợp.",
        ADVISOR_SERVICE_BROWSE_PATH
      ),
      serviceNeed,
    };
  }

  const referencedListing = await findReferencedListing({ database, text });
  if (referencedListing) {
    return {
      answers,
      pendingQuestionId: null,
      pinnedPlaybookId,
      pinnedSubCategoryId,
      response: buildNoMatchResponse(
        `Mình đã tìm thấy Listing “${referencedListing.title ?? referencedListing.slug}”. Bạn có thể mở Listing để kiểm tra chi tiết và tự chọn gói khi cần.`,
        `/listing/${referencedListing.slug}`
      ),
      serviceNeed,
    };
  }

  const publishedPlaybooks = await loadPublishedPlaybooks(database);
  let playbookMatch:
    | {
        content: AdvisorPlaybookContent;
        matchedSignalIds: string[];
        playbook: PublishedPlaybook;
        score: number;
      }
    | undefined;

  if (pinnedPlaybookId) {
    playbookMatch = getPlaybookMatches(publishedPlaybooks, serviceNeed).find(
      (match) => match.playbook.id === pinnedPlaybookId
    );
    let pinnedPlaybook: PublishedPlaybook | null = null;
    if (!playbookMatch) {
      pinnedPlaybook = await loadPlaybookById(database, pinnedPlaybookId);
      if (isUsablePinnedPlaybook(pinnedPlaybook)) {
        const content = parsePlaybookContent(pinnedPlaybook);
        if (content) {
          playbookMatch = {
            content,
            matchedSignalIds: [],
            playbook: pinnedPlaybook,
            score: 0,
          };
        }
      }
    }
    if (!playbookMatch) {
      return {
        answers,
        pendingQuestionId: null,
        pinnedPlaybookId,
        pinnedSubCategoryId,
        response: buildNoMatchResponse(
          "Playbook của phiên này không còn khả dụng. Bạn có thể tiếp tục bằng cách duyệt nhóm dịch vụ liên quan.",
          pinnedPlaybook
            ? getPlaybookBrowsePath(pinnedPlaybook)
            : ADVISOR_SERVICE_BROWSE_PATH,
          "PLAYBOOK_UNAVAILABLE"
        ),
        serviceNeed,
      };
    }
  } else {
    const matches = getPlaybookMatches(
      publishedPlaybooks,
      serviceNeed
    ).toSorted((left, right) => right.score - left.score);
    if (matches.length === 0) {
      const taxonomyMatches = await findActiveTaxonomyMatches(
        database,
        serviceNeed
      );
      const [taxonomyMatch] = taxonomyMatches;
      if (taxonomyMatch) {
        return {
          answers,
          pendingQuestionId: null,
          pinnedPlaybookId: null,
          pinnedSubCategoryId: null,
          response: buildNoMatchResponse(
            "Nhóm dịch vụ này đang hoạt động nhưng chưa có Playbook đã được xuất bản. Bạn có thể duyệt danh mục để xem các lựa chọn hiện có.",
            getSubCategoryBrowsePath(taxonomyMatch),
            "PLAYBOOK_UNAVAILABLE"
          ),
          serviceNeed,
        };
      }
      return {
        answers,
        pendingQuestionId: null,
        pinnedPlaybookId: null,
        pinnedSubCategoryId: null,
        response: buildNoMatchResponse(
          "Mình chưa tìm thấy nhóm dịch vụ phù hợp. Bạn có thể thử mô tả rõ kết quả mong muốn hoặc duyệt danh mục dịch vụ."
        ),
        serviceNeed,
      };
    }
    const [bestMatch, secondMatch] = matches;
    const normalizedAnswer = normalizeText(text);
    const explicitMatch = matches.find(({ playbook }) =>
      [
        playbook.subCategory.id,
        playbook.subCategory.name,
        playbook.subCategory.slug,
      ].some((value) => normalizeText(value) === normalizedAnswer)
    );
    if (
      !explicitMatch &&
      secondMatch &&
      bestMatch &&
      (bestMatch.score === secondMatch.score ||
        hasMultipleProblemMarkers(serviceNeed))
    ) {
      return {
        answers,
        pendingQuestionId: null,
        pinnedPlaybookId: null,
        pinnedSubCategoryId: null,
        response: buildQuestionResponse(
          makeRoutingQuestion(matches),
          "Mình cần một lựa chọn ngắn để ghim đúng Playbook cho phiên này."
        ),
        serviceNeed,
      };
    }
    const selectedMatch = explicitMatch ?? bestMatch;
    if (!selectedMatch) {
      return {
        answers,
        pendingQuestionId: null,
        pinnedPlaybookId: null,
        pinnedSubCategoryId: null,
        response: buildNoMatchResponse(
          "Mình chưa thể xác định Playbook cho nhu cầu này. Bạn có thể duyệt danh mục dịch vụ."
        ),
        serviceNeed,
      };
    }
    playbookMatch = selectedMatch;
    pinnedPlaybookId = selectedMatch.playbook.id;
    pinnedSubCategoryId = selectedMatch.playbook.subCategory.id;
  }

  if (!playbookMatch) {
    return {
      answers,
      pendingQuestionId: null,
      pinnedPlaybookId,
      pinnedSubCategoryId,
      response: buildNoMatchResponse(
        "Mình chưa thể xác định Playbook cho nhu cầu này. Bạn có thể duyệt danh mục dịch vụ."
      ),
      serviceNeed,
    };
  }
  const { content, playbook } = playbookMatch;
  if (pendingQuestionId) {
    if (pendingQuestionId === ADVISOR_SIGNAL_SELECTION_QUESTION_ID) {
      const normalizedAnswer = normalizeText(text);
      const selectedSignal = content.needSignals.find(
        (signal) =>
          includesKeyword(normalizedAnswer, signal.label) ||
          signal.keywords.some((keyword) =>
            includesKeyword(normalizedAnswer, keyword)
          )
      );
      answers[ADVISOR_SIGNAL_SELECTION_KEY] = selectedSignal?.id ?? text.trim();
      pendingQuestionId = null;
    }
    const pendingQuestion = content.clarificationQuestions.find(
      (question) => question.id === pendingQuestionId
    );
    if (pendingQuestion) {
      answers[pendingQuestion.id] = getAnswerValue(pendingQuestion, text);
    }
    pendingQuestionId = null;
  }

  const searchableText = `${serviceNeed} ${Object.values(answers).join(" ")}`;
  const exclusion = getMatchedExclusion(content, searchableText);
  if (exclusion) {
    return {
      answers,
      pendingQuestionId: null,
      pinnedPlaybookId,
      pinnedSubCategoryId,
      response: buildNoMatchResponse(
        `Mình không thể tiếp tục gợi ý vì nhu cầu có dấu hiệu liên quan đến nội dung bị loại trừ: ${exclusion.label}.`
      ),
      serviceNeed,
    };
  }

  const allMatchedSignals = getMatchedSignals(content, searchableText);
  const selectedSignalId = answers[ADVISOR_SIGNAL_SELECTION_KEY];
  const matchedSignals = selectedSignalId
    ? allMatchedSignals.filter((signal) => signal.id === selectedSignalId)
    : allMatchedSignals;
  if (matchedSignals.length > 1) {
    const signalQuestion = {
      allowFreeText: true as const,
      id: ADVISOR_SIGNAL_SELECTION_QUESTION_ID,
      options: matchedSignals.map((signal) => ({
        label: signal.label,
        value: signal.id,
      })),
      prompt: "Bạn muốn ưu tiên phần nào trong nhu cầu này?",
    };
    return {
      answers,
      pendingQuestionId: signalQuestion.id,
      pinnedPlaybookId,
      pinnedSubCategoryId,
      response: buildQuestionResponse(
        signalQuestion,
        "Mình muốn tập trung vào một Service Need để gợi ý chính xác hơn."
      ),
      serviceNeed,
    };
  }
  const matchedSignalIds = new Set(matchedSignals.map((signal) => signal.id));
  const missingSignal = content.completionRequirements.requiredSignalIds.find(
    (signalId) => !matchedSignalIds.has(signalId)
  );
  const missingQuestion = getMissingRequiredQuestion(content, answers);
  if (missingSignal || missingQuestion) {
    const question = missingQuestion
      ? makeQuestion(missingQuestion)
      : {
          allowFreeText: true as const,
          id: null,
          options: content.suggestionChips.map((chip) => ({
            label: chip.label,
            value: chip.prompt,
          })),
          prompt:
            "Bạn có thể mô tả thêm chi tiết nào để xác định đúng nhu cầu dịch vụ?",
        };
    pendingQuestionId = question.id;
    return {
      answers,
      pendingQuestionId,
      pinnedPlaybookId,
      pinnedSubCategoryId,
      response: buildQuestionResponse(
        question,
        "Mình cần thêm một thông tin trước khi tìm các dịch vụ đang mở bán."
      ),
      serviceNeed,
    };
  }

  const candidates = await findLiveCatalogCandidates({
    database,
    serviceNeed,
    subCategoryId: playbook.subCategory.id,
  });
  if (candidates.length === 0) {
    return {
      answers,
      pendingQuestionId: null,
      pinnedPlaybookId,
      pinnedSubCategoryId,
      response: buildNoMatchResponse(
        "Mình chưa tìm thấy Listing SERVICE đang mở bán phù hợp với nhu cầu này. Bạn có thể duyệt danh mục để xem thêm lựa chọn."
      ),
      serviceNeed,
    };
  }

  const recommendation = buildRecommendation({
    candidates,
    playbook,
    serviceNeed,
  });
  if (!recommendation) {
    return {
      answers,
      pendingQuestionId: null,
      pinnedPlaybookId,
      pinnedSubCategoryId,
      response: buildNoMatchResponse(
        "Mình chưa thể tạo một gợi ý hợp lệ. Bạn hãy thử lại lượt tư vấn này."
      ),
      serviceNeed,
    };
  }

  const parsedRecommendation =
    advisorRecommendationPayloadSchema.safeParse(recommendation);
  if (!parsedRecommendation.success) {
    return {
      answers,
      pendingQuestionId: null,
      pinnedPlaybookId,
      pinnedSubCategoryId,
      response: buildNoMatchResponse(
        "Mình chưa thể xác thực dữ liệu gợi ý. Bạn hãy thử lại lượt tư vấn này."
      ),
      serviceNeed,
    };
  }

  return {
    answers,
    pendingQuestionId: null,
    pinnedPlaybookId,
    pinnedSubCategoryId,
    response: {
      browsePath: null,
      completed: true,
      kind: "RECOMMENDATION",
      message:
        "Mình đã tìm thấy một vài dịch vụ SERVICE đang mở bán. Hãy mở Listing để xem chi tiết và tự chọn gói phù hợp; Advisor không tự thêm vào giỏ hàng.",
      question: null,
      recommendation: parsedRecommendation.data,
    },
    serviceNeed,
  };
};

export const parseAdvisorRecommendationWithRepair = ({
  raw,
  repair,
}: {
  raw: unknown;
  repair: (invalid: unknown) => unknown;
}): z.infer<typeof advisorRecommendationPayloadSchema> => {
  const first = advisorRecommendationPayloadSchema.safeParse(raw);
  if (first.success) {
    return first.data;
  }

  const repaired = advisorRecommendationPayloadSchema.safeParse(repair(raw));
  if (repaired.success) {
    return repaired.data;
  }

  throw new ORPCError("SERVICE_UNAVAILABLE", {
    message: "Advisor returned an invalid recommendation. Please retry.",
  });
};

export const buildAdvisorMessageInsert = ({
  attachmentIds,
  id,
  response,
  sequence,
  sessionId,
  text,
  role,
}: {
  attachmentIds?: readonly string[];
  id?: string;
  response?: AdvisorTurnResponse;
  sequence: number;
  sessionId: string;
  text: string;
  role: "USER" | "ASSISTANT";
}) => ({
  metadata:
    response || attachmentIds?.length
      ? {
          ...(response
            ? {
                browsePath: response.browsePath,
                kind: response.kind,
                question: response.question,
                recommendation: response.recommendation,
              }
            : {}),
          ...(attachmentIds?.length ? { attachmentIds } : {}),
        }
      : undefined,
  ...(id ? { id } : {}),
  role,
  sequence,
  sessionId,
  text,
});
