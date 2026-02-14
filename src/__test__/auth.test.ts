const mockAuth = jest.fn();

jest.mock("next-auth", () => {
  return jest.fn(() => ({
    handlers: { GET: jest.fn(), POST: jest.fn() },
    auth: mockAuth,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }));
});

jest.mock("@/auth.config", () => ({
  default: { providers: [] },
}));

describe("auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exports auth function", async () => {
    const { auth } = await import("@/auth");
    expect(auth).toBeDefined();
    expect(typeof auth).toBe("function");
  });

  it("exports handlers", async () => {
    const { handlers } = await import("@/auth");
    expect(handlers.GET).toBeDefined();
    expect(handlers.POST).toBeDefined();
  });

  it("exports signIn and signOut", async () => {
    const { signIn, signOut } = await import("@/auth");
    expect(signIn).toBeDefined();
    expect(signOut).toBeDefined();
  });
});
