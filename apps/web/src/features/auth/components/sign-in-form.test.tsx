import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SignInForm } from "@/features/auth/components/sign-in-form";

const { signInEmail, signOut } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signOut: vi.fn(),
}));

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/features/auth/api/auth-client", () => ({
  authClient: {
    signIn: {
      email: signInEmail,
    },
    signOut,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

const renderForm = () => render(<SignInForm />);

const fillAndSubmit = async (
  email = "buyer@test.com",
  password = "password123"
) => {
  const user = userEvent.setup();
  renderForm();

  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Mật khẩu"), password);
  await user.click(screen.getByRole("button", { name: /đăng nhập/iu }));
};

describe("SignInForm", () => {
  beforeEach(() => {
    signInEmail.mockReset();
    signOut.mockReset();
    mockNavigate.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  afterEach(cleanup);

  describe("buyer sign-in", () => {
    it("calls signIn.email and navigates on success", async () => {
      signInEmail.mockResolvedValue({
        data: { user: { role: ACCOUNT_ROLE.BUYER } },
        error: null,
      });

      await fillAndSubmit();

      expect(signInEmail).toHaveBeenCalledWith({
        email: "buyer@test.com",
        password: "password123",
      });
      expect(toastSuccess).toHaveBeenCalledWith("Đăng nhập thành công.");
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });

    it("shows error toast when API returns an error", async () => {
      signInEmail.mockResolvedValue({
        data: null,
        error: { message: "Sai mật khẩu." },
      });

      await fillAndSubmit();

      expect(toastError).toHaveBeenCalledWith("Sai mật khẩu.");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("navigates to seller onboarding when seller logs in for the first time without having seen onboarding", async () => {
      signInEmail.mockResolvedValue({
        data: {
          user: { hasSeenSellerOnboarding: false, role: ACCOUNT_ROLE.SELLER },
        },
        error: null,
      });

      await fillAndSubmit("seller@test.com", "password123");

      expect(signInEmail).toHaveBeenCalledWith({
        email: "seller@test.com",
        password: "password123",
      });
      expect(toastSuccess).toHaveBeenCalledWith("Đăng nhập thành công.");
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/seller/onboarding" });
    });

    it("navigates to home when seller logs in and has already seen onboarding", async () => {
      signInEmail.mockResolvedValue({
        data: {
          user: { hasSeenSellerOnboarding: true, role: ACCOUNT_ROLE.SELLER },
        },
        error: null,
      });

      await fillAndSubmit("seller@test.com", "password123");

      expect(toastSuccess).toHaveBeenCalledWith("Đăng nhập thành công.");
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  describe("seller sign-in", () => {
    it("calls signIn.email and navigates on success", async () => {
      signInEmail.mockResolvedValue({
        data: { user: { role: ACCOUNT_ROLE.SELLER } },
        error: null,
      });

      const user = userEvent.setup();
      render(<SignInForm expectedRole={ACCOUNT_ROLE.SELLER} redirectTo="/" />);

      await user.type(screen.getByLabelText("Email"), "seller@test.com");
      await user.type(screen.getByLabelText("Mật khẩu"), "password123");
      await user.click(screen.getByRole("button", { name: /đăng nhập/iu }));

      expect(signInEmail).toHaveBeenCalledWith({
        email: "seller@test.com",
        password: "password123",
      });
      expect(toastSuccess).toHaveBeenCalledWith("Đăng nhập thành công.");
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });

    it("signs out and shows error when role does not match expectedRole", async () => {
      signInEmail.mockResolvedValue({
        data: { user: { role: ACCOUNT_ROLE.BUYER } },
        error: null,
      });

      const user = userEvent.setup();
      render(<SignInForm expectedRole={ACCOUNT_ROLE.SELLER} redirectTo="/" />);

      await user.type(screen.getByLabelText("Email"), "buyer@test.com");
      await user.type(screen.getByLabelText("Mật khẩu"), "password123");
      await user.click(screen.getByRole("button", { name: /đăng nhập/iu }));

      expect(signOut).toHaveBeenCalled();
      expect(toastError).toHaveBeenCalledWith(
        "Tài khoản không thuộc cổng đăng nhập này."
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
