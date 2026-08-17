import { advisorPlaybook } from "@avin/db/schema/advisor";
import { subCategory } from "@avin/db/schema/catalog";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "../access/procedures";
import type { AuditEvent, Context } from "../runtime/context";
import {
  advisorPlaybookContentSchema,
  advisorPlaybookScenarioResultSchema,
  defaultAdvisorPlaybookContent,
  evaluateAdvisorPlaybook,
} from "./playbook";
import type {
  AdvisorPlaybookContent,
  AdvisorPlaybookScenarioResult,
} from "./playbook";

const PLAYBOOK_TARGET_TYPE = "ADVISOR_PLAYBOOK" as const;

const playbookIdInput = z.strictObject({
  id: z.uuid(),
});

const parseContent = (content: unknown): AdvisorPlaybookContent => {
  const parsed = advisorPlaybookContentSchema.safeParse(content);
  if (!parsed.success) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Stored Advisor Playbook content is invalid.",
    });
  }
  return parsed.data;
};

const parseScenarioResults = (
  results: unknown
): AdvisorPlaybookScenarioResult[] => {
  if (!Array.isArray(results)) {
    return [];
  }

  return results.flatMap((result) => {
    const parsed = advisorPlaybookScenarioResultSchema.safeParse(result);
    return parsed.success ? [parsed.data] : [];
  });
};

const serializePlaybook = (playbook: {
  archivedAt: Date | null;
  content: unknown;
  createdAt: Date;
  id: string;
  lastTestedAt: Date | null;
  publishedAt: Date | null;
  scenarioResults: unknown;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  subCategory?: {
    id: string;
    name: string;
    parentCategory?: { id: string; name: string } | null;
    status: "ACTIVE" | "HIDDEN" | "ARCHIVED";
  } | null;
  subCategoryId: string;
  updatedAt: Date;
  version: number;
}) => ({
  archivedAt: playbook.archivedAt?.toISOString() ?? null,
  content: parseContent(playbook.content),
  createdAt: playbook.createdAt.toISOString(),
  id: playbook.id,
  lastTestedAt: playbook.lastTestedAt?.toISOString() ?? null,
  publishedAt: playbook.publishedAt?.toISOString() ?? null,
  scenarioResults: parseScenarioResults(playbook.scenarioResults),
  status: playbook.status,
  subCategory: playbook.subCategory
    ? {
        id: playbook.subCategory.id,
        name: playbook.subCategory.name,
        parentCategory: playbook.subCategory.parentCategory
          ? {
              id: playbook.subCategory.parentCategory.id,
              name: playbook.subCategory.parentCategory.name,
            }
          : null,
        status: playbook.subCategory.status,
      }
    : null,
  subCategoryId: playbook.subCategoryId,
  updatedAt: playbook.updatedAt.toISOString(),
  version: playbook.version,
});

const getPlaybook = (context: Context, id: string) =>
  context.db.query.advisorPlaybook.findFirst({
    where: eq(advisorPlaybook.id, id),
    with: {
      subCategory: {
        with: { parentCategory: true },
      },
    },
  });

const requirePlaybook = async (context: Context, id: string) => {
  const playbook = await getPlaybook(context, id);
  if (!playbook) {
    throw new ORPCError("NOT_FOUND", {
      message: "Advisor Playbook not found.",
    });
  }
  return playbook;
};

const requireDraft = (status: string): void => {
  if (status !== "DRAFT") {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Only DRAFT Advisor Playbooks can be edited or published.",
    });
  }
};

const requireProviderContract = async (context: Context): Promise<void> => {
  if (!context.advisorProvider) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Service Advisor provider configuration is unavailable.",
    });
  }

  const status = await context.advisorProvider.getStatus();
  if (status.state !== "ACTIVE" || !status.contractVerifiedAt) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message:
        "Activate and verify the Service Advisor provider before testing or publishing a Playbook.",
    });
  }
};

const normalizePlaybookError = (error: unknown) => {
  if (error instanceof ORPCError) {
    return error;
  }

  return new ORPCError("SERVICE_UNAVAILABLE", {
    message: "The Advisor Playbook operation could not be completed.",
  });
};

const runAuditedPlaybookAction = async <Result>({
  action,
  context,
  metadata,
  run,
  targetId,
}: {
  action: string;
  context: Context;
  metadata?: Record<string, unknown>;
  run: () => Promise<Result>;
  targetId?: string;
}): Promise<Result> => {
  const recordAudit = async (outcome: AuditEvent["outcome"]): Promise<void> => {
    await context.audit.record({
      action,
      actorUserId: context.session?.user.id ?? "",
      metadata,
      outcome,
      targetId,
      targetType: PLAYBOOK_TARGET_TYPE,
    });
  };

  try {
    const result = await run();
    await recordAudit("SUCCESS");
    return result;
  } catch (error) {
    await recordAudit("FAILURE");
    throw normalizePlaybookError(error);
  }
};

const testPlaybook = async (
  context: Context,
  id: string
): Promise<{
  allPassed: boolean;
  playbook: ReturnType<typeof serializePlaybook>;
  results: AdvisorPlaybookScenarioResult[];
}> => {
  const current = await requirePlaybook(context, id);
  requireDraft(current.status);
  await requireProviderContract(context);

  const content = parseContent(current.content);
  const evaluation = evaluateAdvisorPlaybook(content);
  const testedAt = new Date();
  const [updated] = await context.db
    .update(advisorPlaybook)
    .set({
      lastTestedAt: testedAt,
      scenarioResults: evaluation.results,
      updatedAt: testedAt,
    })
    .where(eq(advisorPlaybook.id, id))
    .returning();

  if (!updated) {
    throw new ORPCError("NOT_FOUND", {
      message: "Advisor Playbook not found.",
    });
  }

  return {
    allPassed: evaluation.allPassed,
    playbook: serializePlaybook({
      ...updated,
      subCategory: current.subCategory,
    }),
    results: evaluation.results,
  };
};

export const advisorPlaybookRouter = {
  archive: adminProcedure.input(playbookIdInput).handler(({ context, input }) =>
    runAuditedPlaybookAction({
      action: "advisor.playbook.archive",
      context,
      run: async () => {
        const current = await requirePlaybook(context, input.id);
        if (current.status === "ARCHIVED") {
          throw new ORPCError("BAD_REQUEST", {
            message: "Advisor Playbook is already archived.",
          });
        }

        const archivedAt = new Date();
        const [archived] = await context.db
          .update(advisorPlaybook)
          .set({
            archivedAt,
            status: "ARCHIVED",
            updatedAt: archivedAt,
          })
          .where(eq(advisorPlaybook.id, input.id))
          .returning();
        if (!archived) {
          throw new ORPCError("NOT_FOUND", {
            message: "Advisor Playbook not found.",
          });
        }

        return serializePlaybook({
          ...archived,
          subCategory: current.subCategory,
        });
      },
      targetId: input.id,
    })
  ),

  createDraft: adminProcedure
    .input(
      z.strictObject({
        content: advisorPlaybookContentSchema.optional(),
        subCategoryId: z.uuid(),
      })
    )
    .handler(({ context, input }) =>
      runAuditedPlaybookAction({
        action: "advisor.playbook.create",
        context,
        metadata: { subCategoryId: input.subCategoryId },
        run: async () => {
          const category = await context.db.query.subCategory.findFirst({
            where: eq(subCategory.id, input.subCategoryId),
            with: { parentCategory: true },
          });
          if (!category) {
            throw new ORPCError("NOT_FOUND", {
              message: "Sub-Category not found.",
            });
          }

          const [latest] = await context.db.query.advisorPlaybook.findMany({
            columns: { version: true },
            limit: 1,
            orderBy: [desc(advisorPlaybook.version)],
            where: eq(advisorPlaybook.subCategoryId, input.subCategoryId),
          });
          const [created] = await context.db
            .insert(advisorPlaybook)
            .values({
              content: input.content ?? defaultAdvisorPlaybookContent(),
              subCategoryId: input.subCategoryId,
              version: (latest?.version ?? 0) + 1,
            })
            .returning();
          if (!created) {
            throw new ORPCError("SERVICE_UNAVAILABLE", {
              message: "Advisor Playbook draft could not be created.",
            });
          }

          return serializePlaybook({
            ...created,
            subCategory: category,
          });
        },
      })
    ),

  get: adminProcedure
    .input(playbookIdInput)
    .handler(async ({ context, input }) => {
      const playbook = await requirePlaybook(context, input.id);
      return serializePlaybook(playbook);
    }),

  list: adminProcedure.handler(async ({ context }) => {
    const [categories, playbooks] = await Promise.all([
      context.db.query.subCategory.findMany({
        orderBy: [asc(subCategory.name)],
        with: { parentCategory: true },
      }),
      context.db.query.advisorPlaybook.findMany({
        orderBy: [
          asc(advisorPlaybook.subCategoryId),
          desc(advisorPlaybook.version),
        ],
        with: {
          subCategory: {
            with: { parentCategory: true },
          },
        },
      }),
    ]);

    return {
      playbooks: playbooks.map((playbook) => serializePlaybook(playbook)),
      subCategories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        parentCategory: category.parentCategory
          ? {
              id: category.parentCategory.id,
              name: category.parentCategory.name,
            }
          : null,
        status: category.status,
      })),
    };
  }),

  publish: adminProcedure.input(playbookIdInput).handler(({ context, input }) =>
    runAuditedPlaybookAction({
      action: "advisor.playbook.publish",
      context,
      run: async () => {
        const current = await requirePlaybook(context, input.id);
        requireDraft(current.status);
        await requireProviderContract(context);

        const content = parseContent(current.content);
        const evaluation = evaluateAdvisorPlaybook(content);
        const testedAt = new Date();
        if (!evaluation.allPassed) {
          await context.db
            .update(advisorPlaybook)
            .set({
              lastTestedAt: testedAt,
              scenarioResults: evaluation.results,
              updatedAt: testedAt,
            })
            .where(eq(advisorPlaybook.id, input.id));
          throw new ORPCError("PRECONDITION_FAILED", {
            message:
              "Publish is blocked until every positive, ambiguous, exclusion, and no-match scenario passes.",
          });
        }

        const published = await context.db.transaction(async (transaction) => {
          const category = await transaction.query.subCategory.findFirst({
            where: eq(subCategory.id, current.subCategoryId),
            with: { parentCategory: true },
          });
          if (
            !category ||
            category.status !== "ACTIVE" ||
            category.parentCategory?.status !== "ACTIVE"
          ) {
            throw new ORPCError("PRECONDITION_FAILED", {
              message:
                "A Playbook can only be published for an active Sub-Category and Parent Category.",
            });
          }

          await transaction
            .update(advisorPlaybook)
            .set({
              archivedAt: testedAt,
              status: "ARCHIVED",
              updatedAt: testedAt,
            })
            .where(
              and(
                eq(advisorPlaybook.subCategoryId, current.subCategoryId),
                eq(advisorPlaybook.status, "PUBLISHED")
              )
            );

          const [updated] = await transaction
            .update(advisorPlaybook)
            .set({
              lastTestedAt: testedAt,
              publishedAt: testedAt,
              scenarioResults: evaluation.results,
              status: "PUBLISHED",
              updatedAt: testedAt,
            })
            .where(
              and(
                eq(advisorPlaybook.id, input.id),
                eq(advisorPlaybook.status, "DRAFT")
              )
            )
            .returning();
          if (!updated) {
            throw new ORPCError("CONFLICT", {
              message: "Advisor Playbook changed before it could be published.",
            });
          }
          return { ...updated, subCategory: category };
        });

        return serializePlaybook(published);
      },
      targetId: input.id,
    })
  ),

  test: adminProcedure.input(playbookIdInput).handler(({ context, input }) =>
    runAuditedPlaybookAction({
      action: "advisor.playbook.test",
      context,
      run: () => testPlaybook(context, input.id),
      targetId: input.id,
    })
  ),

  updateDraft: adminProcedure
    .input(
      z.strictObject({
        content: advisorPlaybookContentSchema,
        id: z.uuid(),
      })
    )
    .handler(({ context, input }) =>
      runAuditedPlaybookAction({
        action: "advisor.playbook.update",
        context,
        run: async () => {
          const current = await requirePlaybook(context, input.id);
          requireDraft(current.status);
          const updatedAt = new Date();
          const [updated] = await context.db
            .update(advisorPlaybook)
            .set({
              content: input.content,
              lastTestedAt: null,
              scenarioResults: [],
              updatedAt,
            })
            .where(
              and(
                eq(advisorPlaybook.id, input.id),
                eq(advisorPlaybook.status, "DRAFT")
              )
            )
            .returning();
          if (!updated) {
            throw new ORPCError("CONFLICT", {
              message: "Advisor Playbook changed before it could be updated.",
            });
          }

          return serializePlaybook({
            ...updated,
            subCategory: current.subCategory,
          });
        },
        targetId: input.id,
      })
    ),
};
