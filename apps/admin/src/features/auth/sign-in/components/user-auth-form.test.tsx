import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserAuthForm } from "./user-auth-form";

const { signInEmailMock, navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  signInEmailMock: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: signInEmailMock,
    },
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

describe("UserAuthForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports UserAuthForm function component", () => {
    expect(UserAuthForm).toBeDefined();
    expect(typeof UserAuthForm).toBe("function");
  });
});
