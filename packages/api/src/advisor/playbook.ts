import { z } from "zod";

export const advisorPlaybookStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export type AdvisorPlaybookStatus = z.infer<typeof advisorPlaybookStatusSchema>;

export const advisorPlaybookScenarioTypeSchema = z.enum([
  "POSITIVE",
  "AMBIGUOUS",
  "EXCLUSION",
  "NO_MATCH",
]);

export type AdvisorPlaybookScenarioType = z.infer<
  typeof advisorPlaybookScenarioTypeSchema
>;

const contentIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/u);

const uniqueIds = <T extends { id: string }>(
  values: readonly T[],
  path: (string | number)[],
  ctx: z.RefinementCtx
): void => {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value.id)) {
      ctx.addIssue({
        code: "custom",
        message: "IDs must be unique within a playbook section.",
        path: [...path, index, "id"],
      });
    }
    seen.add(value.id);
  }
};

const needSignalSchema = z.strictObject({
  id: contentIdSchema,
  keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  label: z.string().trim().min(1).max(160),
});

const answerOptionSchema = z.strictObject({
  label: z.string().trim().min(1).max(160),
  value: contentIdSchema,
});

const clarificationQuestionSchema = z.strictObject({
  answerOptions: z.array(answerOptionSchema).min(2).max(8),
  id: contentIdSchema,
  prompt: z.string().trim().min(1).max(500),
  required: z.boolean(),
});

const exclusionConditionSchema = z.strictObject({
  id: contentIdSchema,
  keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  label: z.string().trim().min(1).max(160),
});

const completionRequirementsSchema = z.strictObject({
  requiredQuestionIds: z.array(contentIdSchema).max(20),
  requiredSignalIds: z.array(contentIdSchema).max(32),
});

const suggestionChipSchema = z.strictObject({
  id: contentIdSchema,
  label: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(500),
});

const catalogFixtureSchema = z.strictObject({
  eligible: z.boolean(),
  id: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(200),
});

const scenarioExpectedOutcomeSchema = z.enum([
  "RECOMMENDATION",
  "CLARIFICATION",
  "EXCLUSION",
  "NO_MATCH",
]);

export type AdvisorPlaybookScenarioExpectedOutcome = z.infer<
  typeof scenarioExpectedOutcomeSchema
>;

export const advisorPlaybookScenarioSchema = z.strictObject({
  answers: z.record(z.string(), z.string().trim().max(500)),
  catalogFixtures: z.array(catalogFixtureSchema).max(20),
  expectedOutcome: scenarioExpectedOutcomeSchema,
  id: contentIdSchema,
  inputText: z.string().trim().min(1).max(5000),
  type: advisorPlaybookScenarioTypeSchema,
});

export type AdvisorPlaybookScenario = z.infer<
  typeof advisorPlaybookScenarioSchema
>;

export const advisorPlaybookContentSchema = z
  .strictObject({
    clarificationQuestions: z.array(clarificationQuestionSchema).min(1).max(20),
    completionRequirements: completionRequirementsSchema,
    exclusionConditions: z.array(exclusionConditionSchema).min(1).max(20),
    needSignals: z.array(needSignalSchema).min(1).max(32),
    scenarios: z.array(advisorPlaybookScenarioSchema).min(4).max(20),
    suggestionChips: z.array(suggestionChipSchema).min(1).max(12),
    title: z.string().trim().min(1).max(200),
  })
  .superRefine((content, ctx) => {
    if (
      content.completionRequirements.requiredQuestionIds.length === 0 &&
      content.completionRequirements.requiredSignalIds.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "At least one required signal or question is needed.",
        path: ["completionRequirements"],
      });
    }

    uniqueIds(content.needSignals, ["needSignals"], ctx);
    uniqueIds(content.clarificationQuestions, ["clarificationQuestions"], ctx);
    uniqueIds(content.exclusionConditions, ["exclusionConditions"], ctx);
    uniqueIds(content.suggestionChips, ["suggestionChips"], ctx);
    uniqueIds(content.scenarios, ["scenarios"], ctx);

    const scenarioTypes = new Set(
      content.scenarios.map((scenario) => scenario.type)
    );
    for (const requiredType of advisorPlaybookScenarioTypeSchema.options) {
      if (!scenarioTypes.has(requiredType)) {
        ctx.addIssue({
          code: "custom",
          message: `At least one ${requiredType} scenario is required.`,
          path: ["scenarios"],
        });
      }
    }

    const signalIds = new Set(content.needSignals.map((signal) => signal.id));
    for (const signalId of content.completionRequirements.requiredSignalIds) {
      if (!signalIds.has(signalId)) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown required need signal: ${signalId}.`,
          path: ["completionRequirements", "requiredSignalIds"],
        });
      }
    }

    const questionIds = new Set(
      content.clarificationQuestions.map((question) => question.id)
    );
    for (const questionId of content.completionRequirements
      .requiredQuestionIds) {
      if (!questionIds.has(questionId)) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown required clarification question: ${questionId}.`,
          path: ["completionRequirements", "requiredQuestionIds"],
        });
      }
    }

    const questionsById = new Map(
      content.clarificationQuestions.map((question) => [question.id, question])
    );
    for (const [scenarioIndex, scenario] of content.scenarios.entries()) {
      for (const [questionId, answer] of Object.entries(scenario.answers)) {
        const question = questionsById.get(questionId);
        if (!question) {
          ctx.addIssue({
            code: "custom",
            message: `Scenario answer references unknown question: ${questionId}.`,
            path: ["scenarios", scenarioIndex, "answers", questionId],
          });
          continue;
        }
        if (!question.answerOptions.some((option) => option.value === answer)) {
          ctx.addIssue({
            code: "custom",
            message: `Scenario answer is not an allowed option for ${questionId}.`,
            path: ["scenarios", scenarioIndex, "answers", questionId],
          });
        }
      }
    }
  });

export type AdvisorPlaybookContent = z.infer<
  typeof advisorPlaybookContentSchema
>;

export const advisorPlaybookScenarioResultSchema = z.strictObject({
  actualOutcome: scenarioExpectedOutcomeSchema,
  details: z.string().trim().min(1).max(500),
  expectedOutcome: scenarioExpectedOutcomeSchema,
  passed: z.boolean(),
  scenarioId: contentIdSchema,
  type: advisorPlaybookScenarioTypeSchema,
});

export type AdvisorPlaybookScenarioResult = z.infer<
  typeof advisorPlaybookScenarioResultSchema
>;

export interface AdvisorPlaybookEvaluation {
  allPassed: boolean;
  results: AdvisorPlaybookScenarioResult[];
}

const normalize = (value: string): string => value.trim().toLocaleLowerCase();

const includesKeyword = (text: string, keywords: readonly string[]): boolean =>
  keywords.some((keyword) => text.includes(normalize(keyword)));

const determineScenarioOutcome = (
  content: AdvisorPlaybookContent,
  scenario: AdvisorPlaybookScenario
): {
  details: string;
  outcome: AdvisorPlaybookScenarioExpectedOutcome;
} => {
  const answerText = Object.values(scenario.answers).join(" ");
  const searchableText = normalize(`${scenario.inputText} ${answerText}`);
  const matchedSignals = content.needSignals.filter((signal) =>
    includesKeyword(searchableText, signal.keywords)
  );
  const matchedExclusions = content.exclusionConditions.filter((condition) =>
    includesKeyword(searchableText, condition.keywords)
  );
  const missingSignals =
    content.completionRequirements.requiredSignalIds.flatMap((signalId) => {
      const signal = content.needSignals.find((item) => item.id === signalId);
      return signal &&
        !matchedSignals.some((matched) => matched.id === signal.id)
        ? [signal]
        : [];
    });
  const missingQuestions =
    content.completionRequirements.requiredQuestionIds.flatMap((questionId) => {
      const question = content.clarificationQuestions.find(
        (item) => item.id === questionId
      );
      return question && !scenario.answers[question.id]?.trim()
        ? [question]
        : [];
    });
  const eligibleFixtures = scenario.catalogFixtures.filter(
    (fixture) => fixture.eligible
  );

  if (matchedExclusions.length > 0) {
    return {
      details: `Matched exclusion: ${matchedExclusions[0]?.label ?? "unknown"}.`,
      outcome: "EXCLUSION",
    };
  }

  if (matchedSignals.length === 0) {
    return {
      details: "No configured need signal matched the scenario input.",
      outcome: "NO_MATCH",
    };
  }

  if (matchedSignals.length > 1 || missingSignals.length > 0) {
    return {
      details:
        matchedSignals.length > 1
          ? "Multiple need signals matched; clarification is required."
          : `Missing required signals: ${missingSignals.map((signal) => signal.label).join(", ")}.`,
      outcome: "CLARIFICATION",
    };
  }

  if (missingQuestions.length > 0) {
    return {
      details: `Missing required answers: ${missingQuestions.map((question) => question.prompt).join(", ")}.`,
      outcome: "CLARIFICATION",
    };
  }

  if (eligibleFixtures.length === 0) {
    return {
      details: "No eligible deterministic catalog fixture is available.",
      outcome: "NO_MATCH",
    };
  }

  return {
    details: `Matched ${matchedSignals[0]?.label ?? "need"} with ${eligibleFixtures.length} eligible fixture(s).`,
    outcome: "RECOMMENDATION",
  };
};

export const evaluateAdvisorPlaybook = (
  content: AdvisorPlaybookContent
): AdvisorPlaybookEvaluation => {
  const results = content.scenarios.map((scenario) => {
    const evaluation = determineScenarioOutcome(content, scenario);
    return {
      actualOutcome: evaluation.outcome,
      details: evaluation.details,
      expectedOutcome: scenario.expectedOutcome,
      passed: evaluation.outcome === scenario.expectedOutcome,
      scenarioId: scenario.id,
      type: scenario.type,
    };
  });

  return {
    allPassed: results.every((result) => result.passed),
    results,
  };
};

export const defaultAdvisorPlaybookContent = (): AdvisorPlaybookContent => ({
  clarificationQuestions: [
    {
      answerOptions: [
        { label: "Cá nhân", value: "personal" },
        { label: "Doanh nghiệp", value: "business" },
      ],
      id: "scope",
      prompt: "Nhu cầu này phục vụ cá nhân hay doanh nghiệp?",
      required: true,
    },
  ],
  completionRequirements: {
    requiredQuestionIds: ["scope"],
    requiredSignalIds: [],
  },
  exclusionConditions: [
    {
      id: "secrets",
      keywords: ["password", "mật khẩu", "otp"],
      label: "Yêu cầu chứa thông tin bí mật",
    },
  ],
  needSignals: [
    {
      id: "account-setup",
      keywords: ["account", "tài khoản"],
      label: "Thiết lập tài khoản",
    },
    {
      id: "website-setup",
      keywords: ["website", "trang web"],
      label: "Thiết lập website",
    },
  ],
  scenarios: [
    {
      answers: { scope: "personal" },
      catalogFixtures: [
        { eligible: true, id: "fixture-positive", title: "Fixture service" },
      ],
      expectedOutcome: "RECOMMENDATION",
      id: "positive",
      inputText: "Tôi cần hỗ trợ tài khoản",
      type: "POSITIVE",
    },
    {
      answers: { scope: "personal" },
      catalogFixtures: [
        { eligible: true, id: "fixture-ambiguous", title: "Fixture service" },
      ],
      expectedOutcome: "CLARIFICATION",
      id: "ambiguous",
      inputText: "Tôi cần hỗ trợ account và website",
      type: "AMBIGUOUS",
    },
    {
      answers: { scope: "personal" },
      catalogFixtures: [],
      expectedOutcome: "EXCLUSION",
      id: "exclusion",
      inputText: "Tôi quên password của tài khoản",
      type: "EXCLUSION",
    },
    {
      answers: {},
      catalogFixtures: [],
      expectedOutcome: "NO_MATCH",
      id: "no-match",
      inputText: "Tôi muốn tìm một việc hoàn toàn khác",
      type: "NO_MATCH",
    },
  ],
  suggestionChips: [
    {
      id: "account-help",
      label: "Hỗ trợ tài khoản",
      prompt: "Tôi cần hỗ trợ tài khoản",
    },
    {
      id: "website-help",
      label: "Hỗ trợ website",
      prompt: "Tôi cần hỗ trợ website",
    },
  ],
  title: "Playbook mới",
});
