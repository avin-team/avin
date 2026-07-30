import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserAuthForm } from "./user-auth-form";

const { navigateMock, invalidateMock, signInEmailMock, signOutMock } =
  vi.hoisted(() => ({
    invalidateMock: vi.fn(),
    navigateMock: vi.fn(),
    signInEmailMock: vi.fn(),
    signOutMock: vi.fn(),
  }));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: signInEmailMock,
    },
    signOut: signOutMock,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useRouter: () => ({ invalidate: invalidateMock }),
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
