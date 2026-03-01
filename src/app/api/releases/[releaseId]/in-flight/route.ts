import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { canCreateRelease, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { in_flight, release_events, shipment_items } from "@/lib/schema";
import { ensureTenantExists, tenantCondition } from "@/lib/tenant";
import { createInFlightRowSchema } from "@/lib/validation/releases";

function parseReleaseId(id: string | undefined) {
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ releaseId: string }> },
) {
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
  const releaseId = parseReleaseId(resolvedParams.releaseId);

  if (!releaseId) {
    return NextResponse.json({ error: "Invalid release id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createInFlightRowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  try {
    const releaseTenantFilter = tenantCondition(user, release_events.institution_id);
    const releaseCondition = releaseTenantFilter
      ? and(eq(release_events.id, releaseId), releaseTenantFilter)
      : eq(release_events.id, releaseId);

    const [release] = await db
      .select({
        id: release_events.id,
        institution_id: release_events.institution_id,
        shipment_id: release_events.shipment_id,
      })
      .from(release_events)
      .where(releaseCondition)
      .limit(1);

    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    await ensureTenantExists(release.institution_id);

    const created = await db.transaction(async (tx) => {
      const shipmentItemTenantFilter = tenantCondition(
        user,
        shipment_items.institution_id,
        release.institution_id,
      );
      const shipmentItemCondition = shipmentItemTenantFilter
        ? and(eq(shipment_items.id, payload.shipment_item_id), shipmentItemTenantFilter)
        : eq(shipment_items.id, payload.shipment_item_id);

      const [shipmentItem] = await tx
        .select({
          id: shipment_items.id,
          institution_id: shipment_items.institution_id,
          shipment_id: shipment_items.shipment_id,
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

      if (!shipmentItem || shipmentItem.shipment_id !== release.shipment_id) {
        throw new Error("INVALID_SHIPMENT_ITEM");
      }

      await tx.execute(sql`
        select id
        from shipment_items
        where id = ${shipmentItem.id}
          and institution_id = ${release.institution_id}
        for update
      `);

      const inFlightTenantFilter = tenantCondition(
        user,
        in_flight.institution_id,
        release.institution_id,
      );
      const inFlightCondition = inFlightTenantFilter
        ? and(eq(in_flight.shipment_item_id, payload.shipment_item_id), inFlightTenantFilter)
        : eq(in_flight.shipment_item_id, payload.shipment_item_id);

      const [existing] = await tx
        .select({
          quantity: sql<number>`coalesce(sum(${in_flight.quantity}), 0)`.as("quantity"),
        })
        .from(in_flight)
        .where(inFlightCondition)
        .limit(1);

      const deadCount =
        shipmentItem.damaged_in_transit +
        shipmentItem.diseased_in_transit +
        shipmentItem.parasite +
        shipmentItem.non_emergence +
        shipmentItem.poor_emergence;

      const allocated = Number(existing?.quantity ?? 0);
      const remaining = shipmentItem.number_received - deadCount - allocated;

      if (payload.quantity > remaining) {
        throw new Error("QUANTITY_EXCEEDS_REMAINING");
      }

      const [inserted] = await tx
        .insert(in_flight)
        .values({
          institution_id: release.institution_id,
          release_event_id: release.id,
          shipment_item_id: shipmentItem.id,
          quantity: payload.quantity,
        })
        .returning({
          id: in_flight.id,
          institution_id: in_flight.institution_id,
          release_event_id: in_flight.release_event_id,
          shipment_item_id: in_flight.shipment_item_id,
          quantity: in_flight.quantity,
          created_at: in_flight.created_at,
          updated_at: in_flight.updated_at,
        });

      return inserted;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_SHIPMENT_ITEM") {
      return NextResponse.json({ error: "Invalid shipment_item" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "QUANTITY_EXCEEDS_REMAINING") {
      return NextResponse.json({ error: "Quantity exceeds remaining" }, { status: 400 });
    }
    logger.error("Failed to add in-flight", error);
    return NextResponse.json({ error: "Unable to add in-flight" }, { status: 500 });
  }
}
