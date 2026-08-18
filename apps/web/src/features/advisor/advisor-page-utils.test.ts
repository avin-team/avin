import { describe, expect, it } from "vitest";

import { getAdvisorFeedbackAttachments } from "./advisor-page-utils";

describe("getAdvisorFeedbackAttachments", () => {
  it("returns no attachments when there is no recommendation or handoff", () => {
    expect(getAdvisorFeedbackAttachments(null, null)).toEqual([]);
  });
});
