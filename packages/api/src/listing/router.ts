import { categoryGovernanceRouter } from "./category-governance";
import { listingDiscoveryRouter } from "./listing-discovery";

export const listingRouter = {
  categoryGovernance: categoryGovernanceRouter,
  discovery: listingDiscoveryRouter,
};
