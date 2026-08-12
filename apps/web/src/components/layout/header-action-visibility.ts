import { ACCOUNT_ROLE } from "@avin/auth/permissions";

interface HeaderActionVisibility {
  showChat: boolean;
  showSellerStore: boolean;
}

export const canAccessSellerFeatures = (
  hasSellerProfile: boolean,
  isSellerApproved: boolean
): boolean => hasSellerProfile && isSellerApproved;

export const getHeaderActionVisibility = (
  role: string | null | undefined,
  hasSellerProfile: boolean,
  isSellerApproved: boolean
): HeaderActionVisibility => {
  const isSeller = role === ACCOUNT_ROLE.SELLER;
  const canAccessSellerActions = canAccessSellerFeatures(
    hasSellerProfile,
    isSellerApproved
  );

  return {
    showChat: !isSeller || canAccessSellerActions,
    showSellerStore: isSeller && canAccessSellerActions,
  };
};
