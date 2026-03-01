import { GET as getMe } from "@/app/api/users/me/route";
import { auth } from "@/auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

const authMock = auth as jest.Mock;

describe("GET /api/users/me", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await getMe();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 200 with current user shape", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "u1",
        name: "Ada",
        email: "ada@example.com",
        role: "EMPLOYEE",
        institutionId: 1,
      },
    });

    const response = await getMe();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "u1",
      name: "Ada",
      email: "ada@example.com",
      role: "EMPLOYEE",
      institutionId: 1,
    });
  });

  it("returns 403 when institutionId is not a valid positive integer", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "u2",
        name: "Ada",
        email: "ada@example.com",
        role: "EMPLOYEE",
        institutionId: null,
      },
    });

    const response = await getMe();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });
});
