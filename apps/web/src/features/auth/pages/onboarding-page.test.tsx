import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingPage } from "./onboarding-page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  mutateAsync: vi.fn(),
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    isPending: false,
    mutateAsync: mocks.mutateAsync,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: mocks.toastSuccess,
  },
}));

vi.mock("@/features/auth/api/auth-client", () => ({
  authClient: {
    getSession: mocks.getSession,
  },
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    sellerApplication: {
      selectRole: {
        mutationOptions: () => ({}),
      },
    },
  },
}));

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({});
    mocks.mutateAsync.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders role selection options", () => {
    render(<OnboardingPage />);

    expect(screen.getByText("Chào mừng bạn đến với Avin!")).toBeInTheDocument();
    expect(screen.getByText("Tôi là người mua (Buyer)")).toBeInTheDocument();
    expect(screen.getByText("Tôi là người bán (Seller)")).toBeInTheDocument();
  });

  it("handles Buyer selection by updating role and navigating to home", async () => {
    render(<OnboardingPage />);

    const buyerButton = screen.getByRole("button", {
      name: /Tôi là người mua/iu,
    });
    fireEvent.click(buyerButton);

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({ role: "BUYER" });
      expect(mocks.getSession).toHaveBeenCalled();
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" });
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Chào mừng bạn đến với Avin!"
      );
    });
  });

  it("handles Seller selection by updating role and navigating to seller onboarding", async () => {
    render(<OnboardingPage />);

    const sellerButton = screen.getByRole("button", {
      name: /Tôi là người bán/iu,
    });
    fireEvent.click(sellerButton);

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({ role: "SELLER" });
      expect(mocks.getSession).toHaveBeenCalled();
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/seller/onboarding",
      });
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Đã thiết lập vai trò Người bán."
      );
    });
  });
});
