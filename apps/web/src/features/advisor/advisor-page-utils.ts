export const getAdvisorFeedbackAttachments = <T>(
  handoffSelection: { attachments: T[]; recommendationId: string } | null,
  recommendationId: string | null | undefined
): T[] => {
  if (!handoffSelection || !recommendationId) {
    return [];
  }
  if (handoffSelection.recommendationId !== recommendationId) {
    return [];
  }
  return handoffSelection.attachments;
};
