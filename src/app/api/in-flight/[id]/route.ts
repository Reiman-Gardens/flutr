import { NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { canCreateRelease, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { in_flight, shipment_items } from "@/lib/schema";
import { ensureTenantExists, tenantCondition } from "@/lib/tenant";
import { updateInFlightQuantitySchema } from "@/lib/validation/releases";

function parseInFlightId(id: string | undefined) {
  if (!id || !/^\d+$/.test(id)) return null;
  const parsed = Number.parseInt(id, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatZodIssues(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.filter((value) => typeof value !== "symbol").join("."),
    message: issue.message,
  }));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canCreateRelease(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const inFlightId = parseInFlightId(resolvedParams.id);

  if (!inFlightId) {
    return NextResponse.json({ error: "Invalid in-flight id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateInFlightQuantitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  try {
    const inFlightTenantFilter = tenantCondition(user, in_flight.institution_id);
    const inFlightCondition = inFlightTenantFilter
      ? and(eq(in_flight.id, inFlightId), inFlightTenantFilter)
      : eq(in_flight.id, inFlightId);

    const [row] = await db
      .select({
        id: in_flight.id,
        institution_id: in_flight.institution_id,
        shipment_item_id: in_flight.shipment_item_id,
      })
      .from(in_flight)
      .where(inFlightCondition)
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "In-flight row not found" }, { status: 404 });
    }

    await ensureTenantExists(row.institution_id);

    const updated = await db.transaction(async (tx) => {
      const shipmentItemTenantFilter = tenantCondition(
        user,
        shipment_items.institution_id,
        row.institution_id,
      );
      const shipmentItemCondition = shipmentItemTenantFilter
        ? and(eq(shipment_items.id, row.shipment_item_id), shipmentItemTenantFilter)
        : eq(shipment_items.id, row.shipment_item_id);

      const [shipmentItem] = await tx
        .select({
          id: shipment_items.id,
          number_received: shipment_items.number_received,
          damaged_in_transit: shipment_items.damaged_in_transit,
          diseased_in_transit: shipment_items.diseased_in_transit,
          parasite: shipment_items.parasite,
          non_emergence: shipment_items.non_emergence,
          poor_emergence: shipment_items.poor_emergence,
        })
        .from(shipment_items)
        .where(shipmentItemCondition)
        .limit(1);

      if (!shipmentItem) {
        throw new Error("IN_FLIGHT_ROW_NOT_FOUND");
      }

      await tx.execute(sql`
        select id
        from shipment_items
        where id = ${row.shipment_item_id}
          and institution_id = ${row.institution_id}
        for update
      `);

      const otherRowsTenantFilter = tenantCondition(
        user,
        in_flight.institution_id,
        row.institution_id,
      );
      const otherRowsCondition = otherRowsTenantFilter
        ? and(
            eq(in_flight.shipment_item_id, row.shipment_item_id),
            ne(in_flight.id, row.id),
            otherRowsTenantFilter,
          )
        : and(eq(in_flight.shipment_item_id, row.shipment_item_id), ne(in_flight.id, row.id));

      const [allocatedOtherRows] = await tx
        .select({
          quantity: sql<number>`coalesce(sum(${in_flight.quantity}), 0)`.as("quantity"),
        })
        .from(in_flight)
        .where(otherRowsCondition)
        .limit(1);

      const deadCount =
        shipmentItem.damaged_in_transit +
        shipmentItem.diseased_in_transit +
        shipmentItem.parasite +
        shipmentItem.non_emergence +
        shipmentItem.poor_emergence;

      const remaining =
        shipmentItem.number_received - deadCount - Number(allocatedOtherRows?.quantity ?? 0);

      if (payload.quantity > remaining) {
        throw new Error("QUANTITY_EXCEEDS_REMAINING");
      }

      const [next] = await tx
        .update(in_flight)
        .set({ quantity: payload.quantity })
        .where(inFlightCondition)
        .returning({
          id: in_flight.id,
          institution_id: in_flight.institution_id,
          release_event_id: in_flight.release_event_id,
          shipment_item_id: in_flight.shipment_item_id,
          quantity: in_flight.quantity,
          created_at: in_flight.created_at,
          updated_at: in_flight.updated_at,
        });

      if (!next) {
        throw new Error("IN_FLIGHT_ROW_NOT_FOUND");
      }

      return next;
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "IN_FLIGHT_ROW_NOT_FOUND") {
      return NextResponse.json({ error: "In-flight row not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "QUANTITY_EXCEEDS_REMAINING") {
      return NextResponse.json({ error: "Quantity exceeds remaining" }, { status: 400 });
    }
    logger.error("Failed to update in-flight", error);
    return NextResponse.json({ error: "Unable to update in-flight" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  let user;
  try {
    user = requireUser(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canCreateRelease(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const inFlightId = parseInFlightId(resolvedParams.id);

  if (!inFlightId) {
    return NextResponse.json({ error: "Invalid in-flight id" }, { status: 400 });
  }

  try {
    const inFlightTenantFilter = tenantCondition(user, in_flight.institution_id);
    const inFlightCondition = inFlightTenantFilter
      ? and(eq(in_flight.id, inFlightId), inFlightTenantFilter)
      : eq(in_flight.id, inFlightId);

    const [row] = await db
      .select({
        id: in_flight.id,
        institution_id: in_flight.institution_id,
      })
      .from(in_flight)
      .where(inFlightCondition)
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "In-flight row not found" }, { status: 404 });
    }

    await ensureTenantExists(row.institution_id);

    await db.delete(in_flight).where(inFlightCondition);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("Failed to delete in-flight", error);
    return NextResponse.json({ error: "Unable to delete in-flight" }, { status: 500 });
  }
}
