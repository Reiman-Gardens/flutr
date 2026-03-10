import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { butterfly_species, in_flight, shipment_items, shipments, suppliers } from "@/lib/schema";
import { updateShipmentSchema } from "@/lib/validation/shipments";
import { and, eq, inArray, sql } from "drizzle-orm";
import { canReadShipment, canWriteShipment, requireUser } from "@/lib/authz";
import { ensureTenantExists, resolveTenantId, tenantCondition } from "@/lib/tenant";
import { deleteShipmentTenantSchema } from "@/lib/validation/shipments";

function parseShipmentId(id: string | undefined) {
  if (!id || !/^\d+$/.test(id)) return null;
  const parsed = Number.parseInt(id, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const resolvedParams = await params;
  const shipmentId = parseShipmentId(resolvedParams.id);

  if (!shipmentId) {
    return NextResponse.json({ error: "Invalid shipment id" }, { status: 400 });
  }

  try {
    // Build tenant-aware shipment condition
    const baseCondition = eq(shipments.id, shipmentId);
    const tenantFilter = tenantCondition(user, shipments.institution_id);

    const shipmentCondition = tenantFilter ? and(baseCondition, tenantFilter) : baseCondition;

    const [shipment] = await db
      .select({
        id: shipments.id,
        institutionId: shipments.institution_id,
        supplierCode: shipments.supplier_code,
        shipmentDate: shipments.shipment_date,
        arrivalDate: shipments.arrival_date,
        createdAt: shipments.created_at,
      })
      .from(shipments)
      .where(shipmentCondition)
      .limit(1);

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // Build tenant-aware items condition
    const baseItemsCondition = eq(shipment_items.shipment_id, shipmentId);
    const itemsTenantFilter = tenantCondition(user, shipment_items.institution_id);

    const itemsCondition = itemsTenantFilter
      ? and(baseItemsCondition, itemsTenantFilter)
      : baseItemsCondition;

    const rawItems = await db
      .select({
        id: shipment_items.id,
        butterflySpeciesId: shipment_items.butterfly_species_id,
        numberReceived: shipment_items.number_received,
        emergedInTransit: shipment_items.emerged_in_transit,
        damagedInTransit: shipment_items.damaged_in_transit,
        diseasedInTransit: shipment_items.diseased_in_transit,
        parasite: shipment_items.parasite,
        nonEmergence: shipment_items.non_emergence,
        poorEmergence: shipment_items.poor_emergence,
        scientificName: butterfly_species.scientific_name,
        imageOpen: butterfly_species.img_wings_open,
        imageClosed: butterfly_species.img_wings_closed,
        inFlightQuantity: sql<number>`coalesce(sum(${in_flight.quantity}), 0)`.as(
          "in_flight_quantity",
        ),
      })
      .from(shipment_items)
      .leftJoin(butterfly_species, eq(shipment_items.butterfly_species_id, butterfly_species.id))
      .leftJoin(
        in_flight,
        and(
          eq(shipment_items.id, in_flight.shipment_item_id),
          eq(shipment_items.institution_id, in_flight.institution_id),
        ),
      )
      .where(itemsCondition)
      .groupBy(
        shipment_items.id,
        shipment_items.butterfly_species_id,
        shipment_items.number_received,
        shipment_items.emerged_in_transit,
        shipment_items.damaged_in_transit,
        shipment_items.diseased_in_transit,
        shipment_items.parasite,
        shipment_items.non_emergence,
        shipment_items.poor_emergence,
        butterfly_species.scientific_name,
        butterfly_species.img_wings_open,
        butterfly_species.img_wings_closed,
      );

    const items = rawItems.map((item) => ({
      id: item.id,
      butterflySpeciesId: item.butterflySpeciesId,
      numberReceived: item.numberReceived,
      emergedInTransit: item.emergedInTransit,
      damagedInTransit: item.damagedInTransit,
      diseasedInTransit: item.diseasedInTransit,
      parasite: item.parasite,
      nonEmergence: item.nonEmergence,
      poorEmergence: item.poorEmergence,
      scientificName: item.scientificName ?? "Unknown species",
      imageUrl: item.imageOpen ?? item.imageClosed ?? null,
      inFlightQuantity: Number(item.inFlightQuantity ?? 0),
    }));

    return NextResponse.json({ shipment, items });
  } catch (error) {
    logger.error("Failed to load shipment", error);
    return NextResponse.json({ error: "Unable to load shipment" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const resolvedParams = await params;
  const shipmentId = parseShipmentId(resolvedParams.id);

  if (!shipmentId) {
    return NextResponse.json({ error: "Invalid shipment id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateShipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
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
  const itemIds = payload.items?.map((item) => item.id) ?? [];

  try {
    const shipmentTenantFilter = tenantCondition(
      user,
      shipments.institution_id,
      targetInstitutionId,
    );
    const shipmentCondition = shipmentTenantFilter
      ? and(eq(shipments.id, shipmentId), shipmentTenantFilter)
      : eq(shipments.id, shipmentId);

    const [shipment] = await db
      .select({
        id: shipments.id,
        shipment_date: shipments.shipment_date,
        arrival_date: shipments.arrival_date,
      })
      .from(shipments)
      .where(shipmentCondition)
      .limit(1);

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const nextShipmentDate = payload.shipmentDate
      ? new Date(payload.shipmentDate)
      : new Date(shipment.shipment_date);
    const nextArrivalDate = payload.arrivalDate
      ? new Date(payload.arrivalDate)
      : new Date(shipment.arrival_date);

    if (nextArrivalDate < nextShipmentDate) {
      return NextResponse.json(
        { error: "Arrival date must be on or after shipment date" },
        { status: 400 },
      );
    }

    if (payload.supplierCode) {
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
    }

    const itemsTenantFilter = tenantCondition(
      user,
      shipment_items.institution_id,
      targetInstitutionId,
    );

    await db.transaction(async (tx) => {
      if (payload.supplierCode || payload.shipmentDate || payload.arrivalDate) {
        const updateData: Record<string, unknown> = {};
        if (payload.supplierCode) updateData.supplier_code = payload.supplierCode;
        if (payload.shipmentDate) updateData.shipment_date = nextShipmentDate;
        if (payload.arrivalDate) updateData.arrival_date = nextArrivalDate;

        const headerCondition = shipmentTenantFilter
          ? and(eq(shipments.id, shipmentId), shipmentTenantFilter)
          : eq(shipments.id, shipmentId);

        await tx.update(shipments).set(updateData).where(headerCondition);
      }

      if (payload.items) {
        const baseItemsCondition = and(
          eq(shipment_items.shipment_id, shipmentId),
          inArray(shipment_items.id, itemIds),
        );
        const itemsCondition = itemsTenantFilter
          ? and(baseItemsCondition, itemsTenantFilter)
          : baseItemsCondition;

        const itemsInShipment = await tx
          .select({ id: shipment_items.id })
          .from(shipment_items)
          .where(itemsCondition);

        if (itemsInShipment.length !== itemIds.length) {
          throw new Error("ITEMS_OUT_OF_SCOPE");
        }

        await Promise.all(
          payload.items.map((item) => {
            const baseUpdateCondition = and(
              eq(shipment_items.shipment_id, shipmentId),
              eq(shipment_items.id, item.id),
            );
            const updateCondition = itemsTenantFilter
              ? and(baseUpdateCondition, itemsTenantFilter)
              : baseUpdateCondition;

            return tx
              .update(shipment_items)
              .set({
                number_received: item.numberReceived,
                emerged_in_transit: item.emergedInTransit,
                damaged_in_transit: item.damagedInTransit,
                diseased_in_transit: item.diseasedInTransit,
                parasite: item.parasite,
                non_emergence: item.nonEmergence,
                poor_emergence: item.poorEmergence,
              })
              .where(updateCondition);
          }),
        );
      }
    });

    return NextResponse.json({ updated: payload.items?.length ?? 0 });
  } catch (error) {
    if (error instanceof Error && error.message === "ITEMS_OUT_OF_SCOPE") {
      return NextResponse.json(
        { error: "One or more items do not belong to this shipment" },
        { status: 400 },
      );
    }
    logger.error("Failed to update shipment", error);
    return NextResponse.json({ error: "Unable to update shipment" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const resolvedParams = await params;
  const shipmentId = parseShipmentId(resolvedParams.id);

  if (!shipmentId) {
    return NextResponse.json({ error: "Invalid shipment id" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payloadParse = deleteShipmentTenantSchema.safeParse(body);
  if (!payloadParse.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: payloadParse.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const payload = payloadParse.data;
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

  const shipmentTenantFilter = tenantCondition(user, shipments.institution_id, targetInstitutionId);
  const shipmentCondition = shipmentTenantFilter
    ? and(eq(shipments.id, shipmentId), shipmentTenantFilter)
    : eq(shipments.id, shipmentId);

  const [shipment] = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(shipmentCondition)
    .limit(1);

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  await db.delete(shipments).where(shipmentCondition);

  return NextResponse.json({ deleted: true });
}
