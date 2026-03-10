import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { canCreateRelease, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { in_flight, release_events, shipment_items, shipments } from "@/lib/schema";
import { createReleaseFromShipmentSchema } from "@/lib/validation/releases";
import { ensureTenantExists, tenantCondition } from "@/lib/tenant";

function parseShipmentId(id: string | undefined) {
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = createReleaseFromShipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: formatZodIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  try {
    const shipmentTenantFilter = tenantCondition(user, shipments.institution_id);
    const shipmentCondition = shipmentTenantFilter
      ? and(eq(shipments.id, shipmentId), shipmentTenantFilter)
      : eq(shipments.id, shipmentId);

    const [shipment] = await db
      .select({ id: shipments.id, institution_id: shipments.institution_id })
      .from(shipments)
      .where(shipmentCondition)
      .limit(1);

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    await ensureTenantExists(shipment.institution_id);

    const releaseDate = parsed.data.released_at ? new Date(parsed.data.released_at) : new Date();
    const releasedBy =
      parsed.data.created_by ??
      (typeof user.name === "string" && user.name.trim().length > 0
        ? user.name
        : typeof user.email === "string" && user.email.trim().length > 0
          ? user.email
          : `user:${String(user.id ?? "unknown")}`);

    const itemsToRelease = parsed.data.items ?? [];

    const created = await db.transaction(async (tx) => {
      const [createdRelease] = await tx
        .insert(release_events)
        .values({
          institution_id: shipment.institution_id,
          shipment_id: shipment.id,
          release_date: releaseDate,
          released_by: releasedBy,
        })
        .returning({
          id: release_events.id,
          institution_id: release_events.institution_id,
          shipment_id: release_events.shipment_id,
          release_date: release_events.release_date,
          released_by: release_events.released_by,
          created_at: release_events.created_at,
          updated_at: release_events.updated_at,
        });

      if (itemsToRelease.length === 0) {
        return createdRelease;
      }

      const shipmentItemTenantFilter = tenantCondition(
        user,
        shipment_items.institution_id,
        shipment.institution_id,
      );
      const inFlightTenantFilter = tenantCondition(
        user,
        in_flight.institution_id,
        shipment.institution_id,
      );
      const seenShipmentItemIds = new Set<number>();

      for (const releaseItem of itemsToRelease) {
        if (seenShipmentItemIds.has(releaseItem.shipment_item_id)) {
          throw new Error("DUPLICATE_SHIPMENT_ITEM");
        }
        seenShipmentItemIds.add(releaseItem.shipment_item_id);

        const baseShipmentItemCondition = and(
          eq(shipment_items.id, releaseItem.shipment_item_id),
          eq(shipment_items.shipment_id, shipment.id),
        );
        const shipmentItemCondition = shipmentItemTenantFilter
          ? and(baseShipmentItemCondition, shipmentItemTenantFilter)
          : baseShipmentItemCondition;

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
          throw new Error("INVALID_SHIPMENT_ITEM");
        }

        await tx.execute(sql`
          select id
          from shipment_items
          where id = ${shipmentItem.id}
            and institution_id = ${shipment.institution_id}
          for update
        `);

        const inFlightCondition = inFlightTenantFilter
          ? and(eq(in_flight.shipment_item_id, shipmentItem.id), inFlightTenantFilter)
          : eq(in_flight.shipment_item_id, shipmentItem.id);

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

        if (releaseItem.quantity > remaining) {
          throw new Error("QUANTITY_EXCEEDS_REMAINING");
        }

        await tx.insert(in_flight).values({
          institution_id: shipment.institution_id,
          release_event_id: createdRelease.id,
          shipment_item_id: shipmentItem.id,
          quantity: releaseItem.quantity,
        });
      }

      return createdRelease;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_SHIPMENT_ITEM") {
      return NextResponse.json({ error: "Invalid shipment_item" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "QUANTITY_EXCEEDS_REMAINING") {
      return NextResponse.json({ error: "Quantity exceeds remaining" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "DUPLICATE_SHIPMENT_ITEM") {
      return NextResponse.json({ error: "Duplicate shipment_item_id in items" }, { status: 400 });
    }
    logger.error("Failed to create release", error);
    return NextResponse.json({ error: "Unable to create release" }, { status: 500 });
  }
}
