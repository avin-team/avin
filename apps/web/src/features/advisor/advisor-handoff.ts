export const ADVISOR_HANDOFF_STORAGE_KEY = "avin.advisor.handoff";

export interface AdvisorHandoffDraft {
  attachmentIds: string[];
  attachmentsCopied: boolean;
  handoffId: string;
  includeSummaryInCheckout: boolean;
  listingId: string;
  recommendationId: string;
  sessionId: string;
  summary: string;
}

export const getAdvisorHandoffDraft = (): AdvisorHandoffDraft | null => {
  try {
    const raw = window.localStorage.getItem(ADVISOR_HANDOFF_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const candidate = parsed as Partial<AdvisorHandoffDraft>;
    if (
      !Array.isArray(candidate.attachmentIds) ||
      !candidate.attachmentIds.every((id) => typeof id === "string") ||
      typeof candidate.handoffId !== "string" ||
      typeof candidate.includeSummaryInCheckout !== "boolean" ||
      typeof candidate.listingId !== "string" ||
      typeof candidate.recommendationId !== "string" ||
      typeof candidate.sessionId !== "string" ||
      typeof candidate.summary !== "string"
    ) {
      return null;
    }
    return {
      attachmentIds: candidate.attachmentIds,
      attachmentsCopied: candidate.attachmentsCopied === true,
      handoffId: candidate.handoffId,
      includeSummaryInCheckout: candidate.includeSummaryInCheckout,
      listingId: candidate.listingId,
      recommendationId: candidate.recommendationId,
      sessionId: candidate.sessionId,
      summary: candidate.summary,
    };
  } catch {
    return null;
  }
};

export const saveAdvisorHandoffDraft = (draft: AdvisorHandoffDraft): void => {
  try {
    window.localStorage.setItem(
      ADVISOR_HANDOFF_STORAGE_KEY,
      JSON.stringify(draft)
    );
  } catch {
    // Private browsing can deny localStorage; server confirmation remains authoritative.
  }
};

export const clearAdvisorHandoffDraft = (): void => {
  try {
    window.localStorage.removeItem(ADVISOR_HANDOFF_STORAGE_KEY);
  } catch {
    // Ignore storage errors; the server handoff remains retained.
  }
};
