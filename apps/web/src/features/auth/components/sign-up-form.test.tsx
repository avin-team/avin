import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SignUpForm } from "@/features/auth/components/sign-up-form";

const { signUpEmail } = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
}));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/features/auth/api/auth-client", () => ({
  authClient: {
    signUp: {
      email: signUpEmail,
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

const fillAndSubmit = async (
  name = "Người Dùng",
  email = "user@test.com",
  password = "password123"
) => {
  const user = userEvent.setup();
  render(<SignUpForm />);

  await user.type(screen.getByLabelText("Họ và tên"), name);
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Mật khẩu"), password);
  await user.click(screen.getByRole("button", { name: /tạo tài khoản/iu }));
};

describe("SignUpForm", () => {
  beforeEach(() => {
    signUpEmail.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  afterEach(cleanup);

  describe("buyer sign-up", () => {
    it("calls signUp.email and shows success message on submit", async () => {
      signUpEmail.mockResolvedValue({ data: {}, error: null });

      await fillAndSubmit();

      expect(signUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "user@test.com",
          name: "Người Dùng",
          password: "password123",
          role: ACCOUNT_ROLE.BUYER,
        })
      );
      expect(toastSuccess).toHaveBeenCalledWith(
        "Vui lòng kiểm tra email để xác minh tài khoản."
      );
      expect(
        screen.getByText(/email xác minh đã được gửi đến/iu)
      ).toBeInTheDocument();
      expect(screen.getByText(/user@test\.com/iu)).toBeInTheDocument();
    });

    it("shows error toast when API returns an error", async () => {
      signUpEmail.mockResolvedValue({
        data: null,
        error: { message: "Email đã tồn tại." },
      });

      await fillAndSubmit();

      expect(toastError).toHaveBeenCalledWith("Email đã tồn tại.");
      expect(
        screen.queryByText(/email xác minh đã được gửi đến/iu)
      ).not.toBeInTheDocument();
    });

    it("allows re-registering with a different email after success", async () => {
      signUpEmail.mockResolvedValue({ data: {}, error: null });

      const user = userEvent.setup();
      render(<SignUpForm />);

      await user.type(screen.getByLabelText("Họ và tên"), "Người Dùng");
      await user.type(screen.getByLabelText("Email"), "first@test.com");
      await user.type(screen.getByLabelText("Mật khẩu"), "password123");
      await user.click(screen.getByRole("button", { name: /tạo tài khoản/iu }));

      expect(
        screen.getByText(/email xác minh đã được gửi đến/iu)
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: /đăng ký email khác/iu })
      );

      expect(screen.getByLabelText("Họ và tên")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
  });

  describe("seller sign-up", () => {
    it("calls signUp.email with seller role", async () => {
      signUpEmail.mockResolvedValue({ data: {}, error: null });

      const user = userEvent.setup();
      render(<SignUpForm role={ACCOUNT_ROLE.SELLER} />);

      await user.type(screen.getByLabelText("Họ và tên"), "Seller One");
      await user.type(screen.getByLabelText("Email"), "seller@test.com");
      await user.type(screen.getByLabelText("Mật khẩu"), "password123");
      await user.click(
        screen.getByRole("button", { name: /tạo tài khoản seller/iu })
      );

      expect(signUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "seller@test.com",
          name: "Seller One",
          password: "password123",
          role: ACCOUNT_ROLE.SELLER,
        })
      );
    });
  });
});
