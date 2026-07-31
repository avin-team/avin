import { beforeEach, describe, expect, it, vi } from "vitest";

import { TwoFactorLoginForm } from "./two-factor-login-form";

const { navigateMock, invalidateMock, verifyTotpMock, getSessionMock } =
  vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    invalidateMock: vi.fn(),
    navigateMock: vi.fn(),
    verifyTotpMock: vi.fn(),
  }));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    getSession: getSessionMock,
    signOut: vi.fn(),
    twoFactor: {
      verifyTotp: verifyTotpMock,
    },
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useRouter: () => ({ invalidate: invalidateMock }),
}));

describe("TwoFactorLoginForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports TwoFactorLoginForm function component", () => {
    expect(TwoFactorLoginForm).toBeDefined();
    expect(typeof TwoFactorLoginForm).toBe("function");
  });
});
