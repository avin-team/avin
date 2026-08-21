import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ListingDetailPage } from "./listing-detail-page";

const mocks = vi.hoisted(() => ({
  addToCart: vi.fn(),
  navigate: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("@/features/auth/api/session-query", () => ({
  useSession: mocks.useSession,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/">{children}</a>
  ),
  useNavigate: () => mocks.navigate,
  useParams: () => ({ id: "listing-1" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    isPending: false,
    mutate: mocks.addToCart,
  }),
  useQuery: () => ({
    data: {
      category: null,
      completedOrderCount: 0,
      description: "Mô tả",
      id: "listing-1",
      images: [],
      priceAmount: 100_000,
      processingTimeHours: null,
      ratingCount: 0,
      ratingScore: "0",
      seller: null,
      servicePackages: [],
      thumbnailUrl: null,
      title: "Listing thử nghiệm",
      type: "PRODUCT",
      warrantyDurationHours: null,
      warrantyTerms: null,
    },
    isError: false,
    isLoading: false,
  }),
  useQueryClient: () => ({
    cancelQueries: vi.fn(),
    getQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
    removeQueries: vi.fn(),
    setQueryData: vi.fn(),
  }),
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    commerce: {
      cart: {
        add: { mutationOptions: () => ({}) },
        get: { queryOptions: () => ({ queryKey: ["cart"] }) },
      },
    },
    listing: {
      discovery: {
        listingById: { queryOptions: () => ({ queryKey: ["listing"] }) },
      },
    },
  },
}));

vi.mock("@/components/shell", () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/catalog/components/listing-media-gallery", () => ({
  ListingMediaGallery: () => null,
}));

vi.mock("@/features/catalog/components/listing-reviews-section", () => ({
  ListingReviewsSection: () => null,
}));

vi.mock("@/features/catalog/components/service-package-selector", () => ({
  ServicePackageSelector: () => null,
}));

describe("ListingDetailPage purchase actions", () => {
  beforeEach(() => {
    mocks.addToCart.mockReset();
    mocks.navigate.mockReset();
    mocks.useSession.mockReset();
  });

  afterEach(cleanup);

  it.each(["Mua ngay", "Thêm vào giỏ"])(
    "redirects guests to login when clicking %s",
    async (buttonName) => {
      mocks.useSession.mockReturnValue({ data: null, isPending: false });
      const user = userEvent.setup();
      render(<ListingDetailPage />);

      await user.click(screen.getByRole("button", { name: buttonName }));

      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login" });
      expect(mocks.addToCart).not.toHaveBeenCalled();
    }
  );

  it("adds the listing to the cart for an authenticated user", async () => {
    mocks.useSession.mockReturnValue({
      data: { user: { id: "buyer-1" } },
      isPending: false,
    });
    const user = userEvent.setup();
    render(<ListingDetailPage />);

    await user.click(screen.getByRole("button", { name: "Thêm vào giỏ" }));

    expect(mocks.addToCart).toHaveBeenCalledWith({
      listingId: "listing-1",
      packageId: undefined,
    });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
