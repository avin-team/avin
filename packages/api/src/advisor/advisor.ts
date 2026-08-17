import { createHash } from "node:crypto";

import type { advisorSession } from "@avin/db/schema/advisor";
import { advisorPlaybook } from "@avin/db/schema/advisor";
import { listing, servicePackage } from "@avin/db/schema/catalog";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { sellerIsNotEnforcedCondition } from "../listing/listing-discovery";
import type { Context } from "../runtime/context";
import { advisorPlaybookContentSchema } from "./playbook";
import type { AdvisorPlaybookContent } from "./playbook";

export const ADVISOR_CONSENT_VERSION = "v1" as const;
export const ADVISOR_VISITOR_CAPABILITY_COOKIE = "avin_advisor_capability";
export const ADVISOR_VISITOR_SESSION_HOURS = 24;
export const ADVISOR_USER_SESSION_DAYS = 30;
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
  completed: z.boolean(),
  kind: z.enum(["QUESTION", "RECOMMENDATION", "NO_MATCH"]),
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
    id: string;
    name: string;
    priceAmount: number;
    processingTimeHours: number;
    warrantyPolicy: unknown;
  }[];
  slug: string;
  title: string | null;
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

const hashVisitorCapability = (capability: string): string =>
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

const buildNoMatchResponse = (message: string): AdvisorTurnResponse => ({
  completed: false,
  kind: "NO_MATCH",
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

const getCandidateFitScore = (
  candidate: CatalogCandidate,
  serviceNeed: string
): number => {
  const candidateText = normalizeText(
    `${candidate.title ?? ""} ${candidate.description ?? ""}`
  );
  const needTokens = new Set(
    normalizeText(serviceNeed)
      .split(" ")
      .filter((token) => token.length >= 3)
  );
  return [...needTokens].filter((token) => candidateText.includes(token))
    .length;
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
  const ranked = candidates.toSorted((left, right) => {
    const fitDifference =
      getCandidateFitScore(right, serviceNeed) -
      getCandidateFitScore(left, serviceNeed);
    if (fitDifference !== 0) {
      return fitDifference;
    }

    const ratingDifference =
      Number(right.ratingScore) - Number(left.ratingScore);
    if (ratingDifference !== 0) {
      return ratingDifference;
    }

    return right.completedOrderCount - left.completedOrderCount;
  });

  const diversified: CatalogCandidate[] = [];
  const sellers = new Set<string>();
  for (const candidate of ranked) {
    if (!sellers.has(candidate.sellerId)) {
      diversified.push(candidate);
      sellers.add(candidate.sellerId);
    }
    if (diversified.length === 3) {
      break;
    }
  }
  if (diversified.length < 3) {
    for (const candidate of ranked) {
      if (!diversified.some((item) => item.id === candidate.id)) {
        diversified.push(candidate);
      }
      if (diversified.length === 3) {
        break;
      }
    }
  }

  return {
    isAiGenerated: true,
    label: "Gợi ý do AI tạo",
    listings: diversified.map((candidate) => {
      const packageItem = candidate.servicePackages[0] ?? null;
      const title = candidate.title?.trim() || "Dịch vụ trên Avin";
      const sellerName =
        candidate.sellerProfile?.storefrontName ?? candidate.seller.name;
      const reasons = [
        `Phù hợp với nhóm ${playbook.subCategory.name}.`,
        "Listing đang công khai và có thể mua tại thời điểm tư vấn.",
      ];
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

  const typedCandidates = candidates as unknown as CatalogCandidate[];
  return typedCandidates.filter(
    (candidate) =>
      candidate.category?.status === "ACTIVE" &&
      candidate.category.parentCategory?.status === "ACTIVE" &&
      candidate.servicePackages.length > 0 &&
      getCandidateFitScore(candidate, serviceNeed) >= 0
  );
};

const buildQuestionResponse = (
  question: NonNullable<AdvisorTurnResponse["question"]>,
  message: string
): AdvisorTurnResponse => ({
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
    if (!playbookMatch) {
      return {
        answers,
        pendingQuestionId: null,
        pinnedPlaybookId,
        pinnedSubCategoryId,
        response: buildNoMatchResponse(
          "Playbook của phiên này không còn khả dụng. Bạn có thể tiếp tục bằng cách duyệt danh mục dịch vụ."
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
    if (secondMatch && bestMatch && bestMatch.score === secondMatch.score) {
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
    const selectedMatch = bestMatch;
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
  response,
  sequence,
  sessionId,
  text,
  role,
}: {
  response?: AdvisorTurnResponse;
  sequence: number;
  sessionId: string;
  text: string;
  role: "USER" | "ASSISTANT";
}) => ({
  metadata: response
    ? {
        kind: response.kind,
        question: response.question,
        recommendation: response.recommendation,
      }
    : undefined,
  role,
  sequence,
  sessionId,
  text,
});
