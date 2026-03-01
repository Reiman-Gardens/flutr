import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createShipmentWithTenantSchema } from "@/lib/validation/shipments";
import { butterfly_species, shipment_items, shipments, suppliers } from "@/lib/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { canReadShipment, canWriteShipment, requireUser } from "@/lib/authz";
import { ensureTenantExists, resolveTenantId, tenantCondition } from "@/lib/tenant";

function formatZodIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.filter((p) => typeof p !== "symbol").join("."),
    message: issue.message,
  }));
}

export async function GET() {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canReadShipment(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const tenantFilter = tenantCondition(user, shipments.institution_id);

    const baseQuery = db
      .select({
        id: shipments.id,
        supplierCode: shipments.supplier_code,
        shipmentDate: shipments.shipment_date,
        arrivalDate: shipments.arrival_date,
        createdAt: shipments.created_at,
      })
      .from(shipments);

    const rows = tenantFilter
      ? await baseQuery.where(tenantFilter).orderBy(desc(shipments.shipment_date))
      : await baseQuery.orderBy(desc(shipments.shipment_date));

    return NextResponse.json(rows);
  } catch (error) {
    logger.error("Failed to list shipments", error);
    return NextResponse.json({ error: "Unable to load shipments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canWriteShipment(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createShipmentWithTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  let targetInstitutionId: number;
  try {
    targetInstitutionId = resolveTenantId(user, payload.institutionId);
  } catch {
    return NextResponse.json({ error: "Tenant required" }, { status: 403 });
  }

  try {
    await ensureTenantExists(targetInstitutionId);
  } catch {
    return NextResponse.json({ error: "Institution not found" }, { status: 400 });
  }

  const shipmentDate = new Date(payload.shipmentDate);
  const arrivalDate = new Date(payload.arrivalDate);

  try {
    // Tenant-aware supplier validation
    const supplierTenantFilter = tenantCondition(
      user,
      suppliers.institution_id,
      targetInstitutionId,
    );

    const supplierCondition = supplierTenantFilter
      ? and(supplierTenantFilter, eq(suppliers.code, payload.supplierCode))
      : eq(suppliers.code, payload.supplierCode);

    const [supplier] = await db
      .select({ code: suppliers.code })
      .from(suppliers)
      .where(supplierCondition)
      .limit(1);

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 400 });
    }

    const speciesIds = Array.from(new Set(payload.items.map((item) => item.butterflySpeciesId)));

    const existingSpecies = await db
      .select({ id: butterfly_species.id })
      .from(butterfly_species)
      .where(inArray(butterfly_species.id, speciesIds));

    if (existingSpecies.length !== speciesIds.length) {
      return NextResponse.json({ error: "One or more species are invalid" }, { status: 400 });
    }

    const shipmentId = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(shipments)
        .values({
          institution_id: targetInstitutionId,
          supplier_code: payload.supplierCode,
          shipment_date: shipmentDate,
          arrival_date: arrivalDate,
        })
        .returning({ id: shipments.id });

      const items = payload.items.map((item) => ({
        institution_id: targetInstitutionId,
        shipment_id: inserted.id,
        butterfly_species_id: item.butterflySpeciesId,
        number_received: item.numberReceived,
        emerged_in_transit: item.emergedInTransit,
        damaged_in_transit: item.damagedInTransit,
        diseased_in_transit: item.diseasedInTransit,
        parasite: item.parasite,
        non_emergence: item.nonEmergence,
        poor_emergence: item.poorEmergence,
      }));

      await tx.insert(shipment_items).values(items);

      return inserted.id;
    });

    return NextResponse.json({ id: shipmentId, itemCount: payload.items.length }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create shipment", error);
    return NextResponse.json({ error: "Unable to create shipment" }, { status: 500 });
  }
}
