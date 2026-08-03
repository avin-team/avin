import { orpc } from "@/utils/orpc";

export const servicePackagesQueryOptions = (listingId: string) =>
  orpc.listing.sellerWorkspace.servicePackages.list.queryOptions({
    input: { listingId },
  });
