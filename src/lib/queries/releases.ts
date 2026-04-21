import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { in_flight, release_events, shipment_items, shipments } from "@/lib/schema";

import type {
  CreateInFlightBody,
  CreateReleaseFromShipmentBody,
  UpdateReleaseEventItemsBody,
  UpdateInFlightQuantityBody,
} from "@/lib/validation/releases";

export const RELEASE_ERRORS = {
  SHIPMENT_NOT_FOUND: "Shipment not found",
  SHIPMENT_ITEM_NOT_FOUND: "Shipment item not found",
  RELEASE_EVENT_NOT_FOUND: "Release event not found",
  IN_FLIGHT_NOT_FOUND: "In-flight row not found",
  IN_FLIGHT_ALREADY_EXISTS: "In-flight row already exists for this release item",
  DUPLICATE_SHIPMENT_ITEM: "Duplicate shipment_item_id values are not allowed",
  INVALID_QUANTITY: "Quantity must be a positive integer",
  SHIPMENT_ITEM_RELEASE_MISMATCH: "Shipment item does not belong to the release shipment",
  QUANTITY_EXCEEDS_REMAINING: "Quantity exceeds remaining available butterflies",
  RELEASE_ITEMS_MUST_MATCH:
    "Release update must include every existing in-flight row for the release event",
} as const;

type LockedShipmentItem = {
  id: number;
  shipment_id: number;
  number_received: number;
  damaged_in_transit: number;
  diseased_in_transit: number;
  parasite: number;
  non_emergence: number;
  poor_emergence: number;
};

const LOSS_COLUMNS = [
  "damaged_in_transit",
  "diseased_in_transit",
  "parasite",
  "non_emergence",
  "poor_emergence",
] as const;

type ReleaseItemInput = {
  shipment_item_id: number;
  quantity: number;
};

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function assertReleaseItems(items: ReleaseItemInput[]) {
  const seen = new Set<number>();

  for (const item of items) {
    if (!isPositiveInteger(item.quantity)) {
      throw new Error(RELEASE_ERRORS.INVALID_QUANTITY);
    }

    if (seen.has(item.shipment_item_id)) {
      throw new Error(RELEASE_ERRORS.DUPLICATE_SHIPMENT_ITEM);
    }

    seen.add(item.shipment_item_id);
  }
}

function assertInFlightQuantity(quantity: UpdateInFlightQuantityBody["quantity"]) {
  if (!isPositiveInteger(quantity)) {
    throw new Error(RELEASE_ERRORS.INVALID_QUANTITY);
  }
}

type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Sum all in-flight quantities for a single shipment item, optionally
 * excluding one specific in_flight row (used when updating an existing row).
 */
async function sumReleasedForItem(
  tx: DrizzleTx,
  institutionId: number,
  shipmentItemId: number,
  excludeInFlightId?: number,
): Promise<number> {
  const conditions = [
    eq(in_flight.institution_id, institutionId),
    eq(in_flight.shipment_item_id, shipmentItemId),
  ];
  if (excludeInFlightId !== undefined) {
    conditions.push(ne(in_flight.id, excludeInFlightId));
  }
  const [row] = await tx
    .select({
      quantity: sql<number>`coalesce(sum(${in_flight.quantity}), 0)::int`.as("quantity"),
    })
    .from(in_flight)
    .where(and(...conditions));
  return Number(row?.quantity ?? 0);
}

export function calculateRemaining(item: LockedShipmentItem, alreadyReleased: number) {
  const availableBeforeReleases =
    item.number_received -
    item.damaged_in_transit -
    item.diseased_in_transit -
    item.parasite -
    item.non_emergence -
    item.poor_emergence;

  return availableBeforeReleases - alreadyReleased;
}

/**
 * List release events for an institution (newest first, paginated), enriched
 * with the supplier code of the parent shipment and the total butterflies
 * released in each event.
 */
export async function listInstitutionReleases(institutionId: number, page: number, limit: number) {
  const offset = (page - 1) * limit;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: release_events.id,
        shipmentId: release_events.shipment_id,
        releaseDate: release_events.release_date,
        releasedBy: release_events.released_by,
        supplierCode: shipments.supplier_code,
        shipmentDate: shipments.shipment_date,
        totalReleased: sql<number>`coalesce(sum(${in_flight.quantity}), 0)::int`.as(
          "total_released",
        ),
      })
      .from(release_events)
      .innerJoin(
        shipments,
        and(
          eq(shipments.id, release_events.shipment_id),
          eq(shipments.institution_id, release_events.institution_id),
        ),
      )
      .leftJoin(
        in_flight,
        and(
          eq(in_flight.release_event_id, release_events.id),
          eq(in_flight.institution_id, release_events.institution_id),
        ),
      )
      .where(eq(release_events.institution_id, institutionId))
      .groupBy(
        release_events.id,
        release_events.shipment_id,
        release_events.release_date,
        release_events.released_by,
        shipments.supplier_code,
        shipments.shipment_date,
      )
      .orderBy(desc(release_events.release_date))
      .limit(limit)
      .offset(offset),

    db
      .select({ total: count() })
      .from(release_events)
      .where(eq(release_events.institution_id, institutionId)),
  ]);

  const total = totalResult[0]?.total ?? 0;

  return {
    releases: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/**
 * List release events for a shipment (newest first), enriched with the total
 * butterflies released per event so the shipment-detail history table can
 * render a meaningful "Released" column without an extra round-trip.
 */
export async function listReleaseEventsForShipment(institutionId: number, shipmentId: number) {
  return db
    .select({
      id: release_events.id,
      releaseDate: release_events.release_date,
      releasedBy: release_events.released_by,
      totalReleased: sql<number>`coalesce(sum(${in_flight.quantity}), 0)::int`.as("total_released"),
    })
    .from(release_events)
    .leftJoin(
      in_flight,
      and(
        eq(in_flight.release_event_id, release_events.id),
        eq(in_flight.institution_id, release_events.institution_id),
      ),
    )
    .where(
      and(
        eq(release_events.institution_id, institutionId),
        eq(release_events.shipment_id, shipmentId),
      ),
    )
    .groupBy(release_events.id, release_events.release_date, release_events.released_by)
    .orderBy(desc(release_events.release_date));
}

/**
 * Fetch a release event and its in-flight items.
 */
export async function getReleaseEventWithItems(institutionId: number, releaseEventId: number) {
  const [event] = await db
    .select({
      id: release_events.id,
      shipmentId: release_events.shipment_id,
      releaseDate: release_events.release_date,
      releasedBy: release_events.released_by,
    })
    .from(release_events)
    .where(
      and(eq(release_events.id, releaseEventId), eq(release_events.institution_id, institutionId)),
    )
    .limit(1);

  if (!event) {
    return null;
  }

  const items = await db
    .select({
      id: in_flight.id,
      shipmentItemId: in_flight.shipment_item_id,
      quantity: in_flight.quantity,
    })
    .from(in_flight)
    .where(
      and(
        eq(in_flight.release_event_id, releaseEventId),
        eq(in_flight.institution_id, institutionId),
      ),
    )
    .orderBy(in_flight.id);

  return { event, items };
}

/**
 * Update existing in-flight item quantities for a release event.
 */
export async function updateReleaseEventItems(
  institutionId: number,
  releaseEventId: number,
  payload: UpdateReleaseEventItemsBody,
) {
  assertReleaseItems(payload.items);

  return db.transaction(async (tx) => {
    const [releaseEvent] = await tx
      .select({
        id: release_events.id,
        shipmentId: release_events.shipment_id,
      })
      .from(release_events)
      .where(
        and(
          eq(release_events.id, releaseEventId),
          eq(release_events.institution_id, institutionId),
        ),
      )
      .limit(1);

    if (!releaseEvent) {
      throw new Error(RELEASE_ERRORS.RELEASE_EVENT_NOT_FOUND);
    }

    const shipmentItemIds = payload.items.map((item) => item.shipment_item_id);

    // Read every in-flight row for the release event so we can enforce that
    // the caller supplied an update for each one. Partial updates (omitting
    // an existing row) would silently leave that row untouched, which is
    // almost never what the UI intends.
    const existingRows = await tx
      .select({
        id: in_flight.id,
        shipmentItemId: in_flight.shipment_item_id,
        quantity: in_flight.quantity,
      })
      .from(in_flight)
      .where(
        and(
          eq(in_flight.institution_id, institutionId),
          eq(in_flight.release_event_id, releaseEventId),
        ),
      )
      .for("update");

    const payloadSet = new Set(shipmentItemIds);
    if (
      existingRows.length !== payloadSet.size ||
      existingRows.some((row) => !payloadSet.has(row.shipmentItemId))
    ) {
      throw new Error(RELEASE_ERRORS.RELEASE_ITEMS_MUST_MATCH);
    }

    const existingByShipmentItemId = new Map(existingRows.map((row) => [row.shipmentItemId, row]));

    const lockedItems = await tx
      .select({
        id: shipment_items.id,
        shipment_id: shipment_items.shipment_id,
        number_received: shipment_items.number_received,
        damaged_in_transit: shipment_items.damaged_in_transit,
        diseased_in_transit: shipment_items.diseased_in_transit,
        parasite: shipment_items.parasite,
        non_emergence: shipment_items.non_emergence,
        poor_emergence: shipment_items.poor_emergence,
      })
      .from(shipment_items)
      .where(
        and(
          eq(shipment_items.institution_id, institutionId),
          eq(shipment_items.shipment_id, releaseEvent.shipmentId),
          inArray(shipment_items.id, shipmentItemIds),
        ),
      )
      .for("update");

    if (lockedItems.length !== shipmentItemIds.length) {
      throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
    }

    const lockedItemById = new Map(lockedItems.map((row) => [row.id, row]));

    // Bulk-fetch total released per shipment item in one query, then subtract
    // each item's own current quantity in JS — eliminates the per-item N+1.
    const releasedTotalsRows = await tx
      .select({
        shipment_item_id: in_flight.shipment_item_id,
        total: sql<number>`coalesce(sum(${in_flight.quantity}), 0)::int`.as("total"),
      })
      .from(in_flight)
      .where(
        and(
          eq(in_flight.institution_id, institutionId),
          inArray(in_flight.shipment_item_id, shipmentItemIds),
        ),
      )
      .groupBy(in_flight.shipment_item_id);

    const releasedTotalByShipmentItemId = new Map(
      releasedTotalsRows.map((row) => [row.shipment_item_id, Number(row.total)]),
    );

    for (const item of payload.items) {
      const existing = existingByShipmentItemId.get(item.shipment_item_id);
      const locked = lockedItemById.get(item.shipment_item_id);

      if (!existing || !locked) {
        throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
      }

      // Total released minus the current row's quantity = released by other rows
      const totalReleased = releasedTotalByShipmentItemId.get(item.shipment_item_id) ?? 0;
      const alreadyReleased = totalReleased - existing.quantity;
      const remaining = calculateRemaining(locked, alreadyReleased);

      if (item.quantity > remaining) {
        throw new Error(RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING);
      }

      await tx
        .update(in_flight)
        .set({ quantity: item.quantity, updated_at: new Date() })
        .where(and(eq(in_flight.id, existing.id), eq(in_flight.institution_id, institutionId)));
    }

    return { updated: true };
  });
}

/**
 * Create a release event and corresponding in-flight rows from a shipment.
 *
 * `payload.loss_updates` are applied inside the same transaction as the
 * release event so callers can correct loss-column values atomically with
 * the release they're creating from the remaining inventory.
 */
export async function createReleaseFromShipment(
  institutionId: number,
  shipmentId: number,
  releasedBy: string,
  payload: CreateReleaseFromShipmentBody,
) {
  assertReleaseItems(payload.items);

  return db.transaction(async (tx) => {
    const [shipment] = await tx
      .select({ id: shipments.id })
      .from(shipments)
      .where(and(eq(shipments.id, shipmentId), eq(shipments.institution_id, institutionId)))
      .limit(1);

    if (!shipment) {
      throw new Error(RELEASE_ERRORS.SHIPMENT_NOT_FOUND);
    }

    // Lock the union of items touched by the release + the loss updates so
    // every row used in the subsequent validation is locked in one shot.
    const lossUpdates = payload.loss_updates ?? [];
    const lockedIdSet = new Set<number>([
      ...payload.items.map((item) => item.shipment_item_id),
      ...lossUpdates.map((row) => row.shipment_item_id),
    ]);
    const shipmentItemIds = payload.items.map((item) => item.shipment_item_id);
    const allLockedIds = Array.from(lockedIdSet);

    const lockedItems = await tx
      .select({
        id: shipment_items.id,
        shipment_id: shipment_items.shipment_id,
        number_received: shipment_items.number_received,
        damaged_in_transit: shipment_items.damaged_in_transit,
        diseased_in_transit: shipment_items.diseased_in_transit,
        parasite: shipment_items.parasite,
        non_emergence: shipment_items.non_emergence,
        poor_emergence: shipment_items.poor_emergence,
      })
      .from(shipment_items)
      .where(
        and(
          eq(shipment_items.institution_id, institutionId),
          eq(shipment_items.shipment_id, shipmentId),
          inArray(shipment_items.id, allLockedIds),
        ),
      )
      .for("update");

    if (lockedItems.length !== allLockedIds.length) {
      throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
    }

    // Apply loss updates in memory + via UPDATE statements so downstream
    // remaining checks see the corrected inventory.
    const lockedMutableItems = new Map(lockedItems.map((row) => [row.id, { ...row }]));
    for (const update of lossUpdates) {
      const row = lockedMutableItems.get(update.shipment_item_id);
      if (!row) {
        throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
      }

      const patch: Partial<Record<(typeof LOSS_COLUMNS)[number], number>> = {};
      for (const column of LOSS_COLUMNS) {
        const next = update[column];
        if (typeof next === "number") {
          row[column] = next;
          patch[column] = next;
        }
      }

      if (Object.keys(patch).length === 0) continue;

      await tx
        .update(shipment_items)
        .set({ ...patch, updated_at: new Date() })
        .where(
          and(
            eq(shipment_items.id, update.shipment_item_id),
            eq(shipment_items.institution_id, institutionId),
          ),
        );
    }

    // Replace the original lockedItems list with the mutated copies so the
    // rest of the function reads post-correction values.
    const lockedItemsAfterUpdates = Array.from(lockedMutableItems.values()).filter((row) =>
      shipmentItemIds.includes(row.id),
    );

    if (lockedItemsAfterUpdates.length !== shipmentItemIds.length) {
      throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
    }

    // Query in-flight for every locked id, not just the items being released,
    // so we can also validate that loss-only updates don't push remaining
    // below the already-released quantity for untouched items.
    const releasedRows = await tx
      .select({
        shipment_item_id: in_flight.shipment_item_id,
        quantity: sql<number>`coalesce(sum(${in_flight.quantity}), 0)::int`.as("quantity"),
      })
      .from(in_flight)
      .where(
        and(
          eq(in_flight.institution_id, institutionId),
          inArray(in_flight.shipment_item_id, allLockedIds),
        ),
      )
      .groupBy(in_flight.shipment_item_id);

    // Guard against loss corrections that would push a non-released item's
    // remaining below zero (i.e. losses + in_flight > number_received).
    for (const update of lossUpdates) {
      const row = lockedMutableItems.get(update.shipment_item_id);
      if (!row) continue;
      const alreadyReleased = Number(
        releasedRows.find((r) => r.shipment_item_id === update.shipment_item_id)?.quantity ?? 0,
      );
      if (calculateRemaining(row, alreadyReleased) < 0) {
        throw new Error(RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING);
      }
    }

    const lockedItemById = new Map(lockedItemsAfterUpdates.map((row) => [row.id, row]));
    const alreadyReleasedByShipmentItemId = new Map(
      releasedRows.map((row) => [row.shipment_item_id, Number(row.quantity)]),
    );

    for (const item of payload.items) {
      const locked = lockedItemById.get(item.shipment_item_id);
      if (!locked) {
        throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
      }

      const alreadyReleased = alreadyReleasedByShipmentItemId.get(item.shipment_item_id) ?? 0;
      const remaining = calculateRemaining(locked, alreadyReleased);

      if (item.quantity > remaining) {
        throw new Error(RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING);
      }
    }

    const [releaseEvent] = await tx
      .insert(release_events)
      .values({
        institution_id: institutionId,
        shipment_id: shipmentId,
        release_date: payload.released_at ?? new Date(),
        released_by: releasedBy,
      })
      .returning({
        id: release_events.id,
        shipmentId: release_events.shipment_id,
        releaseDate: release_events.release_date,
        releasedBy: release_events.released_by,
      });

    const inFlightRows = await tx
      .insert(in_flight)
      .values(
        payload.items.map((item) => ({
          institution_id: institutionId,
          release_event_id: releaseEvent.id,
          shipment_item_id: item.shipment_item_id,
          quantity: item.quantity,
        })),
      )
      .returning({
        id: in_flight.id,
        releaseEventId: in_flight.release_event_id,
        shipmentItemId: in_flight.shipment_item_id,
        quantity: in_flight.quantity,
      });

    return {
      event: releaseEvent,
      items: inFlightRows,
    };
  });
}

/**
 * Create a single in-flight row for an existing release event.
 */
export async function createInFlightForRelease(
  institutionId: number,
  releaseEventId: number,
  payload: CreateInFlightBody,
) {
  assertInFlightQuantity(payload.quantity);

  return db.transaction(async (tx) => {
    const [releaseEvent] = await tx
      .select({
        id: release_events.id,
        shipmentId: release_events.shipment_id,
      })
      .from(release_events)
      .where(
        and(
          eq(release_events.id, releaseEventId),
          eq(release_events.institution_id, institutionId),
        ),
      )
      .limit(1);

    if (!releaseEvent) {
      throw new Error(RELEASE_ERRORS.RELEASE_EVENT_NOT_FOUND);
    }

    const [lockedItem] = await tx
      .select({
        id: shipment_items.id,
        shipment_id: shipment_items.shipment_id,
        number_received: shipment_items.number_received,
        damaged_in_transit: shipment_items.damaged_in_transit,
        diseased_in_transit: shipment_items.diseased_in_transit,
        parasite: shipment_items.parasite,
        non_emergence: shipment_items.non_emergence,
        poor_emergence: shipment_items.poor_emergence,
      })
      .from(shipment_items)
      .where(
        and(
          eq(shipment_items.id, payload.shipment_item_id),
          eq(shipment_items.institution_id, institutionId),
        ),
      )
      .for("update");

    if (!lockedItem) {
      throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
    }

    if (lockedItem.shipment_id !== releaseEvent.shipmentId) {
      throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_RELEASE_MISMATCH);
    }

    const [existing] = await tx
      .select({ id: in_flight.id })
      .from(in_flight)
      .where(
        and(
          eq(in_flight.institution_id, institutionId),
          eq(in_flight.release_event_id, releaseEventId),
          eq(in_flight.shipment_item_id, payload.shipment_item_id),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error(RELEASE_ERRORS.IN_FLIGHT_ALREADY_EXISTS);
    }

    const alreadyReleased = await sumReleasedForItem(tx, institutionId, payload.shipment_item_id);
    const remaining = calculateRemaining(lockedItem, alreadyReleased);

    if (payload.quantity > remaining) {
      throw new Error(RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING);
    }

    const [created] = await tx
      .insert(in_flight)
      .values({
        institution_id: institutionId,
        release_event_id: releaseEventId,
        shipment_item_id: payload.shipment_item_id,
        quantity: payload.quantity,
      })
      .returning({
        id: in_flight.id,
        releaseEventId: in_flight.release_event_id,
        shipmentItemId: in_flight.shipment_item_id,
        quantity: in_flight.quantity,
      });

    return created;
  });
}

/**
 * Update quantity for a single in-flight row.
 */
export async function updateInFlightQuantity(
  institutionId: number,
  inFlightId: number,
  payload: UpdateInFlightQuantityBody,
) {
  assertInFlightQuantity(payload.quantity);

  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({
        id: in_flight.id,
        shipmentItemId: in_flight.shipment_item_id,
      })
      .from(in_flight)
      .where(and(eq(in_flight.id, inFlightId), eq(in_flight.institution_id, institutionId)))
      .limit(1);

    if (!target) {
      throw new Error(RELEASE_ERRORS.IN_FLIGHT_NOT_FOUND);
    }

    const [lockedItem] = await tx
      .select({
        id: shipment_items.id,
        shipment_id: shipment_items.shipment_id,
        number_received: shipment_items.number_received,
        damaged_in_transit: shipment_items.damaged_in_transit,
        diseased_in_transit: shipment_items.diseased_in_transit,
        parasite: shipment_items.parasite,
        non_emergence: shipment_items.non_emergence,
        poor_emergence: shipment_items.poor_emergence,
      })
      .from(shipment_items)
      .where(
        and(
          eq(shipment_items.id, target.shipmentItemId),
          eq(shipment_items.institution_id, institutionId),
        ),
      )
      .for("update");

    if (!lockedItem) {
      throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
    }

    const alreadyReleased = await sumReleasedForItem(
      tx,
      institutionId,
      target.shipmentItemId,
      inFlightId,
    );
    const remaining = calculateRemaining(lockedItem, alreadyReleased);

    if (payload.quantity > remaining) {
      throw new Error(RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING);
    }

    const [updated] = await tx
      .update(in_flight)
      .set({ quantity: payload.quantity, updated_at: new Date() })
      .where(and(eq(in_flight.id, inFlightId), eq(in_flight.institution_id, institutionId)))
      .returning({
        id: in_flight.id,
        releaseEventId: in_flight.release_event_id,
        shipmentItemId: in_flight.shipment_item_id,
        quantity: in_flight.quantity,
      });

    if (!updated) {
      throw new Error(RELEASE_ERRORS.IN_FLIGHT_NOT_FOUND);
    }

    return updated;
  });
}

/**
 * Delete a single in-flight row.
 */
export async function deleteInFlightRow(institutionId: number, inFlightId: number) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: in_flight.id,
        shipmentItemId: in_flight.shipment_item_id,
      })
      .from(in_flight)
      .where(and(eq(in_flight.id, inFlightId), eq(in_flight.institution_id, institutionId)))
      .limit(1);

    if (!existing) {
      throw new Error(RELEASE_ERRORS.IN_FLIGHT_NOT_FOUND);
    }

    await tx
      .select({ id: shipment_items.id })
      .from(shipment_items)
      .where(
        and(
          eq(shipment_items.id, existing.shipmentItemId),
          eq(shipment_items.institution_id, institutionId),
        ),
      )
      .for("update");

    const [deleted] = await tx
      .delete(in_flight)
      .where(and(eq(in_flight.id, inFlightId), eq(in_flight.institution_id, institutionId)))
      .returning({ id: in_flight.id });

    if (!deleted) {
      throw new Error(RELEASE_ERRORS.IN_FLIGHT_NOT_FOUND);
    }

    return { deleted: true };
  });
}

/**
 * Delete a release event (in-flight rows cascade).
 */
export async function deleteReleaseEvent(institutionId: number, releaseEventId: number) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: release_events.id })
      .from(release_events)
      .where(
        and(
          eq(release_events.id, releaseEventId),
          eq(release_events.institution_id, institutionId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new Error(RELEASE_ERRORS.RELEASE_EVENT_NOT_FOUND);
    }

    const relatedItems = await tx
      .select({ shipmentItemId: in_flight.shipment_item_id })
      .from(in_flight)
      .where(
        and(
          eq(in_flight.institution_id, institutionId),
          eq(in_flight.release_event_id, releaseEventId),
        ),
      );

    const shipmentItemIds = Array.from(new Set(relatedItems.map((row) => row.shipmentItemId)));

    if (shipmentItemIds.length > 0) {
      await tx
        .select({ id: shipment_items.id })
        .from(shipment_items)
        .where(
          and(
            eq(shipment_items.institution_id, institutionId),
            inArray(shipment_items.id, shipmentItemIds),
          ),
        )
        .for("update");
    }

    const [deleted] = await tx
      .delete(release_events)
      .where(
        and(
          eq(release_events.id, releaseEventId),
          eq(release_events.institution_id, institutionId),
        ),
      )
      .returning({ id: release_events.id });

    if (!deleted) {
      throw new Error(RELEASE_ERRORS.RELEASE_EVENT_NOT_FOUND);
    }

    return { deleted: true };
  });
}
