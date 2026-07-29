import * as z from "zod";

const emailSchema = z.email({
  error: (issue) =>
    issue.input === "" ? "Vui lòng nhập email." : "Email không hợp lệ.",
});

const passwordSchema = z.string().min(8, {
  error: (issue) =>
    issue.input === ""
      ? "Vui lòng nhập mật khẩu."
      : "Mật khẩu phải có ít nhất 8 ký tự.",
});

const totpCodeSchema = z
  .string()
  .regex(/^\d{6}$/u, "Mã xác thực phải gồm đúng 6 chữ số.");

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, {
    error: (issue) =>
      issue.input === ""
        ? "Vui lòng nhập họ và tên."
        : "Họ và tên phải có ít nhất 2 ký tự.",
  }),
  password: passwordSchema,
});

export const twoFactorCodeSchema = z.object({
  code: totpCodeSchema,
});

export const enableTwoFactorSchema = z.object({
  password: z
    .string()
    .refine(
      (password) => password.length === 0 || password.length >= 8,
      "Mật khẩu phải có ít nhất 8 ký tự."
    ),
});
