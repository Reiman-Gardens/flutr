jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/tenant", () => ({
  resolveTenantBySlug: jest.fn(),
}));

jest.mock("@/lib/queries/suppliers", () => ({
  listSuppliersGlobal: jest.fn(),
}));

import { auth } from "@/auth";
import { listSuppliersGlobal } from "@/lib/queries/suppliers";
import { getTenantSuppliers } from "@/lib/services/tenant-suppliers";
import { resolveTenantBySlug } from "@/lib/tenant";

const mockAuth = auth as jest.Mock;
const mockResolveTenantBySlug = resolveTenantBySlug as jest.Mock;
const mockListSuppliersGlobal = listSuppliersGlobal as jest.Mock;

describe("tenant suppliers service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("resolves the tenant slug but returns the global supplier list without tenant filtering", async () => {
    const user = { id: "1", role: "ADMIN", institutionId: 7 };
    const suppliers = [{ id: 1, code: "EBN", name: "El Bosque Nuevo", isActive: true }];

    mockAuth.mockResolvedValueOnce({
      user,
      expires: new Date(Date.now() + 60_000).toISOString(),
    });
    mockResolveTenantBySlug.mockResolvedValueOnce(7);
    mockListSuppliersGlobal.mockResolvedValueOnce(suppliers);

    await expect(getTenantSuppliers({ slug: "butterfly-house" })).resolves.toBe(suppliers);

    expect(mockResolveTenantBySlug).toHaveBeenCalledWith(user, "butterfly-house");
    expect(mockListSuppliersGlobal).toHaveBeenCalledTimes(1);
    expect(mockListSuppliersGlobal).toHaveBeenCalledWith();
  });
});
