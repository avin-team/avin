export interface StoreProfileCompletionData {
  avatarUrl?: string | null;
  bio?: string | null;
  storeSlug?: string | null;
  storefrontName?: string | null;
}

const STORE_PROFILE_REQUIRED_FIELD_COUNT = 4;

export const getStoreProfileCompletion = (
  profile: StoreProfileCompletionData | null | undefined
) => {
  const completedFields = [
    profile?.storefrontName?.trim(),
    profile?.storeSlug?.trim(),
    profile?.bio?.trim(),
    profile?.avatarUrl?.trim(),
  ].filter(Boolean).length;

  return {
    completedFields,
    isComplete: completedFields === STORE_PROFILE_REQUIRED_FIELD_COUNT,
    percentage: Math.round(
      (completedFields / STORE_PROFILE_REQUIRED_FIELD_COUNT) * 100
    ),
  };
};
