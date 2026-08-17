import { describe, expect, it } from "vitest";

import {
  advisorPlaybookContentSchema,
  defaultAdvisorPlaybookContent,
  evaluateAdvisorPlaybook,
} from "./playbook";

describe("Advisor Playbook contract", () => {
  it("requires all four scenario types and evaluates the default draft", () => {
    const content = defaultAdvisorPlaybookContent();

    expect(advisorPlaybookContentSchema.safeParse(content).success).toBe(true);
    expect(evaluateAdvisorPlaybook(content)).toMatchObject({
      allPassed: true,
      results: [
        { actualOutcome: "RECOMMENDATION", type: "POSITIVE" },
        { actualOutcome: "CLARIFICATION", type: "AMBIGUOUS" },
        { actualOutcome: "EXCLUSION", type: "EXCLUSION" },
        { actualOutcome: "NO_MATCH", type: "NO_MATCH" },
      ],
    });
  });

  it("rejects drafts that omit a required scenario category", () => {
    const content = defaultAdvisorPlaybookContent();
    const withoutNoMatch = {
      ...content,
      scenarios: content.scenarios.filter(
        (scenario) => scenario.type !== "NO_MATCH"
      ),
    };

    expect(
      advisorPlaybookContentSchema.safeParse(withoutNoMatch)
    ).toMatchObject({
      success: false,
    });
  });

  it("fails a positive scenario when no eligible catalog fixture remains", () => {
    const content = defaultAdvisorPlaybookContent();
    const withUnavailableFixture = {
      ...content,
      scenarios: content.scenarios.map((scenario) =>
        scenario.type === "POSITIVE"
          ? {
              ...scenario,
              catalogFixtures: [
                { eligible: false, id: "fixture-offline", title: "Offline" },
              ],
              expectedOutcome: "RECOMMENDATION" as const,
            }
          : scenario
      ),
    };

    expect(evaluateAdvisorPlaybook(withUnavailableFixture).allPassed).toBe(
      false
    );
    expect(
      evaluateAdvisorPlaybook(withUnavailableFixture).results[0]
    ).toMatchObject({
      actualOutcome: "NO_MATCH",
      passed: false,
    });
  });
});
