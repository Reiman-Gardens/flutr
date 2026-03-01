import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/schema";
import { canReadSuppliers, requireUser } from "@/lib/authz";
import { tenantCondition } from "@/lib/tenant";

function parseInstitutionId(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: Request) {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canReadSuppliers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const targetInstitutionId = parseInstitutionId(url.searchParams.get("institutionId"));

  let tenantFilter;
  try {
    tenantFilter = tenantCondition(user, suppliers.institution_id, targetInstitutionId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseQuery = db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      code: suppliers.code,
      country: suppliers.country,
      websiteUrl: suppliers.website_url,
      isActive: suppliers.is_active,
    })
    .from(suppliers);

  const rows = tenantFilter ? await baseQuery.where(tenantFilter) : await baseQuery;

  return NextResponse.json(rows);
}
