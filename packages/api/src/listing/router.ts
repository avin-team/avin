import { categoryGovernanceRouter } from "./category-governance";
import { listingDiscoveryRouter } from "./listing-discovery";
import { sellerWorkspaceRouter } from "./seller-workspace";

export const listingRouter = {
  categoryGovernance: categoryGovernanceRouter,
  discovery: listingDiscoveryRouter,
  sellerWorkspace: sellerWorkspaceRouter,
};
