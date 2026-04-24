import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  in_flight,
  release_event_losses,
  release_events,
  shipment_items,
  shipments,
} from "@/lib/schema";

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
  NEGATIVE_LOSS_DELTA:
    "Create release loss_updates cannot decrease shipment loss totals; use shipment edit for corrections",
  LOSS_TOTAL_UNDERFLOW:
    "Release edit would reduce shipment loss totals below zero; adjust shipment totals first",
  EMPTY_RELEASE_EVENT:
    "Release must include at least one in-flight or loss quantity; delete release instead",
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
type LossColumn = (typeof LOSS_COLUMNS)[number];
type LossValues = Record<LossColumn, number>;

type ReleaseItemInput = {
  shipment_item_id: number;
  quantity: number;
};

type ReleaseLossRowInput = {
  shipment_item_id: number;
} & LossValues;

/**
 * Create-flow loss_updates are absolute shipment_item totals. Convert those to
 * positive event attribution deltas and reject any decrease attempts.
 */
export function computeCreateLossDelta(
  existing: LossValues,
  update: Partial<Record<LossColumn, number>>,
) {
  const absolutePatch: Partial<Record<LossColumn, number>> = {};
  const attributionDelta: Partial<Record<LossColumn, number>> = {};

  for (const column of LOSS_COLUMNS) {
    const next = update[column];
    if (typeof next !== "number") continue;

    const delta = next - existing[column];
    if (delta < 0) {
      throw new Error(RELEASE_ERRORS.NEGATIVE_LOSS_DELTA);
    }

    absolutePatch[column] = next;
    if (delta > 0) {
      attributionDelta[column] = delta;
    }
  }

  return { absolutePatch, attributionDelta };
}

/**
 * Delete-flow rollback: subtract event-level loss attribution from current
 * shipment loss totals. Throws when subtraction would underflow.
 */
export function computeDeleteLossRollbackPatch(existing: LossValues, eventLoss: LossValues) {
  const next = { ...existing };
  for (const column of LOSS_COLUMNS) {
    const rolledBack = next[column] - eventLoss[column];
    if (rolledBack < 0) {
      throw new Error(RELEASE_ERRORS.LOSS_TOTAL_UNDERFLOW);
    }
    next[column] = rolledBack;
  }
  return next;
}

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

function assertUpdateReleaseItems(items: ReleaseItemInput[]) {
  const seen = new Set<number>();

  for (const item of items) {
    if (
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 0
    ) {
      throw new Error(RELEASE_ERRORS.INVALID_QUANTITY);
    }

    if (seen.has(item.shipment_item_id)) {
      throw new Error(RELEASE_ERRORS.DUPLICATE_SHIPMENT_ITEM);
    }

    seen.add(item.shipment_item_id);
  }
}

function toLossValues(row?: Partial<LossValues>): LossValues {
  return {
    damaged_in_transit: row?.damaged_in_transit ?? 0,
    diseased_in_transit: row?.diseased_in_transit ?? 0,
    parasite: row?.parasite ?? 0,
    non_emergence: row?.non_emergence ?? 0,
    poor_emergence: row?.poor_emergence ?? 0,
  };
}

function sumLossValues(values: LossValues) {
  return (
    values.damaged_in_transit +
    values.diseased_in_transit +
    values.parasite +
    values.non_emergence +
    values.poor_emergence
  );
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

  const inFlightTotals = db
    .select({
      releaseEventId: in_flight.release_event_id,
      totalReleased: sql<number>`coalesce(sum(${in_flight.quantity}), 0)::int`.as("total_released"),
    })
    .from(in_flight)
    .where(eq(in_flight.institution_id, institutionId))
    .groupBy(in_flight.release_event_id)
    .as("in_flight_totals");

  const lossTotals = db
    .select({
      releaseEventId: release_event_losses.release_event_id,
      totalLosses: sql<number>`coalesce(sum(
        ${release_event_losses.damaged_in_transit}
        + ${release_event_losses.diseased_in_transit}
        + ${release_event_losses.parasite}
        + ${release_event_losses.non_emergence}
        + ${release_event_losses.poor_emergence}
      ), 0)::int`.as("total_losses"),
    })
    .from(release_event_losses)
    .where(eq(release_event_losses.institution_id, institutionId))
    .groupBy(release_event_losses.release_event_id)
    .as("loss_totals");

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: release_events.id,
        shipmentId: release_events.shipment_id,
        releaseDate: release_events.release_date,
        releasedBy: release_events.released_by,
        supplierCode: shipments.supplier_code,
        shipmentDate: shipments.shipment_date,
        totalReleased: sql<number>`coalesce(${inFlightTotals.totalReleased}, 0)::int`.as(
          "total_released",
        ),
        totalLosses: sql<number>`coalesce(${lossTotals.totalLosses}, 0)::int`.as("total_losses"),
      })
      .from(release_events)
      .innerJoin(
        shipments,
        and(
          eq(shipments.id, release_events.shipment_id),
          eq(shipments.institution_id, release_events.institution_id),
        ),
      )
      .leftJoin(inFlightTotals, eq(inFlightTotals.releaseEventId, release_events.id))
      .leftJoin(lossTotals, eq(lossTotals.releaseEventId, release_events.id))
      .where(eq(release_events.institution_id, institutionId))
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
  const inFlightTotals = db
    .select({
      releaseEventId: in_flight.release_event_id,
      totalReleased: sql<number>`coalesce(sum(${in_flight.quantity}), 0)::int`.as("total_released"),
    })
    .from(in_flight)
    .where(eq(in_flight.institution_id, institutionId))
    .groupBy(in_flight.release_event_id)
    .as("in_flight_totals");

  const lossTotals = db
    .select({
      releaseEventId: release_event_losses.release_event_id,
      totalLosses: sql<number>`coalesce(sum(
        ${release_event_losses.damaged_in_transit}
        + ${release_event_losses.diseased_in_transit}
        + ${release_event_losses.parasite}
        + ${release_event_losses.non_emergence}
        + ${release_event_losses.poor_emergence}
      ), 0)::int`.as("total_losses"),
    })
    .from(release_event_losses)
    .where(eq(release_event_losses.institution_id, institutionId))
    .groupBy(release_event_losses.release_event_id)
    .as("loss_totals");

  return db
    .select({
      id: release_events.id,
      releaseDate: release_events.release_date,
      releasedBy: release_events.released_by,
      totalReleased: sql<number>`coalesce(${inFlightTotals.totalReleased}, 0)::int`.as(
        "total_released",
      ),
      totalLosses: sql<number>`coalesce(${lossTotals.totalLosses}, 0)::int`.as("total_losses"),
    })
    .from(release_events)
    .leftJoin(inFlightTotals, eq(inFlightTotals.releaseEventId, release_events.id))
    .leftJoin(lossTotals, eq(lossTotals.releaseEventId, release_events.id))
    .where(
      and(
        eq(release_events.institution_id, institutionId),
        eq(release_events.shipment_id, shipmentId),
      ),
    )
    .orderBy(desc(release_events.release_date));
}

/**
 * Fetch a release event and its in-flight + loss attribution items.
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

  const losses = await db
    .select({
      id: release_event_losses.id,
      shipmentItemId: release_event_losses.shipment_item_id,
      damagedInTransit: release_event_losses.damaged_in_transit,
      diseasedInTransit: release_event_losses.diseased_in_transit,
      parasite: release_event_losses.parasite,
      nonEmergence: release_event_losses.non_emergence,
      poorEmergence: release_event_losses.poor_emergence,
    })
    .from(release_event_losses)
    .where(
      and(
        eq(release_event_losses.release_event_id, releaseEventId),
        eq(release_event_losses.institution_id, institutionId),
      ),
    )
    .orderBy(release_event_losses.id);

  return { event, items, losses };
}

/**
 * Update existing in-flight item quantities for a release event.
 */
export async function updateReleaseEventItems(
  institutionId: number,
  releaseEventId: number,
  payload: UpdateReleaseEventItemsBody,
) {
  assertUpdateReleaseItems(payload.items);

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

    const existingInFlightRows = await tx
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

    const existingLossRows = await tx
      .select({
        id: release_event_losses.id,
        shipmentItemId: release_event_losses.shipment_item_id,
        damaged_in_transit: release_event_losses.damaged_in_transit,
        diseased_in_transit: release_event_losses.diseased_in_transit,
        parasite: release_event_losses.parasite,
        non_emergence: release_event_losses.non_emergence,
        poor_emergence: release_event_losses.poor_emergence,
      })
      .from(release_event_losses)
      .where(
        and(
          eq(release_event_losses.institution_id, institutionId),
          eq(release_event_losses.release_event_id, releaseEventId),
        ),
      )
      .for("update");

    const existingInFlightByShipmentItemId = new Map(
      existingInFlightRows.map((row) => [row.shipmentItemId, row]),
    );
    const existingLossByShipmentItemId = new Map(
      existingLossRows.map((row) => [row.shipmentItemId, row]),
    );

    const desiredInFlightByShipmentItemId = new Map<number, number>(
      payload.items.map((row) => [row.shipment_item_id, row.quantity]),
    );

    // Edit semantics: `losses` are event-level final values for this release.
    // To preserve current UI behavior during rollout, omitted `losses` means
    // "leave existing event losses unchanged".
    const desiredLossByShipmentItemId = new Map<number, LossValues>();
    if (Array.isArray(payload.losses)) {
      for (const row of payload.losses) {
        desiredLossByShipmentItemId.set(row.shipment_item_id, toLossValues(row));
      }
    } else {
      for (const row of existingLossRows) {
        desiredLossByShipmentItemId.set(
          row.shipmentItemId,
          toLossValues({
            damaged_in_transit: row.damaged_in_transit,
            diseased_in_transit: row.diseased_in_transit,
            parasite: row.parasite,
            non_emergence: row.non_emergence,
            poor_emergence: row.poor_emergence,
          }),
        );
      }
    }

    const touchedItemIdSet = new Set<number>([
      ...existingInFlightRows.map((row) => row.shipmentItemId),
      ...existingLossRows.map((row) => row.shipmentItemId),
      ...Array.from(desiredInFlightByShipmentItemId.keys()),
      ...Array.from(desiredLossByShipmentItemId.keys()),
    ]);

    if (touchedItemIdSet.size === 0) {
      throw new Error(RELEASE_ERRORS.EMPTY_RELEASE_EVENT);
    }

    const touchedItemIds = Array.from(touchedItemIdSet);

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
          inArray(shipment_items.id, touchedItemIds),
        ),
      )
      .for("update");

    if (lockedItems.length !== touchedItemIds.length) {
      throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
    }

    const lockedItemById = new Map(lockedItems.map((row) => [row.id, { ...row }]));
    const originalLockedItemById = new Map(lockedItems.map((row) => [row.id, row]));
    const shipmentLossPatchByItemId = new Map<number, LossValues>();

    // Apply event-level loss deltas to shipment source-of-truth loss totals.
    for (const shipmentItemId of touchedItemIds) {
      const existingEventLoss = toLossValues(
        existingLossByShipmentItemId.get(shipmentItemId)
          ? {
              damaged_in_transit:
                existingLossByShipmentItemId.get(shipmentItemId)!.damaged_in_transit,
              diseased_in_transit:
                existingLossByShipmentItemId.get(shipmentItemId)!.diseased_in_transit,
              parasite: existingLossByShipmentItemId.get(shipmentItemId)!.parasite,
              non_emergence: existingLossByShipmentItemId.get(shipmentItemId)!.non_emergence,
              poor_emergence: existingLossByShipmentItemId.get(shipmentItemId)!.poor_emergence,
            }
          : undefined,
      );
      const desiredEventLoss = desiredLossByShipmentItemId.get(shipmentItemId) ?? toLossValues();
      const row = lockedItemById.get(shipmentItemId);
      const originalRow = originalLockedItemById.get(shipmentItemId);
      if (!row || !originalRow) {
        throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
      }

      for (const column of LOSS_COLUMNS) {
        const next = row[column] + (desiredEventLoss[column] - existingEventLoss[column]);
        if (next < 0) {
          throw new Error(RELEASE_ERRORS.LOSS_TOTAL_UNDERFLOW);
        }
        row[column] = next;
      }

      const nextLosses = toLossValues({
        damaged_in_transit: row.damaged_in_transit,
        diseased_in_transit: row.diseased_in_transit,
        parasite: row.parasite,
        non_emergence: row.non_emergence,
        poor_emergence: row.poor_emergence,
      });
      const originalLosses = toLossValues({
        damaged_in_transit: originalRow.damaged_in_transit,
        diseased_in_transit: originalRow.diseased_in_transit,
        parasite: originalRow.parasite,
        non_emergence: originalRow.non_emergence,
        poor_emergence: originalRow.poor_emergence,
      });

      if (LOSS_COLUMNS.some((column) => nextLosses[column] !== originalLosses[column])) {
        shipmentLossPatchByItemId.set(shipmentItemId, nextLosses);
      }
    }

    // Bulk-fetch total released per shipment item in one query, then subtract
    // the current release event's row quantity in JS.
    const releasedTotalsRows = await tx
      .select({
        shipment_item_id: in_flight.shipment_item_id,
        total: sql<number>`coalesce(sum(${in_flight.quantity}), 0)::int`.as("total"),
      })
      .from(in_flight)
      .where(
        and(
          eq(in_flight.institution_id, institutionId),
          inArray(in_flight.shipment_item_id, touchedItemIds),
        ),
      )
      .groupBy(in_flight.shipment_item_id);

    const releasedTotalByShipmentItemId = new Map(
      releasedTotalsRows.map((row) => [row.shipment_item_id, Number(row.total)]),
    );

    // Validate desired in-flight quantities against post-loss shipment state.
    for (const shipmentItemId of touchedItemIds) {
      const locked = lockedItemById.get(shipmentItemId);
      if (!locked) {
        throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
      }

      const existingEventInFlight =
        existingInFlightByShipmentItemId.get(shipmentItemId)?.quantity ?? 0;
      const desiredEventInFlight = desiredInFlightByShipmentItemId.get(shipmentItemId) ?? 0;
      const totalReleased = releasedTotalByShipmentItemId.get(shipmentItemId) ?? 0;
      const alreadyReleased = totalReleased - existingEventInFlight;
      const remaining = calculateRemaining(locked, alreadyReleased);

      if (desiredEventInFlight > remaining) {
        throw new Error(RELEASE_ERRORS.QUANTITY_EXCEEDS_REMAINING);
      }
    }

    const finalInFlightTotal = Array.from(desiredInFlightByShipmentItemId.values()).reduce(
      (sum, qty) => sum + qty,
      0,
    );
    const finalLossTotal = Array.from(desiredLossByShipmentItemId.values()).reduce(
      (sum, values) => sum + sumLossValues(values),
      0,
    );
    if (finalInFlightTotal === 0 && finalLossTotal === 0) {
      throw new Error(RELEASE_ERRORS.EMPTY_RELEASE_EVENT);
    }

    for (const [shipmentItemId, patch] of shipmentLossPatchByItemId) {
      await tx
        .update(shipment_items)
        .set({ ...patch, updated_at: new Date() })
        .where(
          and(
            eq(shipment_items.id, shipmentItemId),
            eq(shipment_items.institution_id, institutionId),
          ),
        );
    }

    const existingInFlightItemIds = new Set<number>();
    for (const existingRow of existingInFlightRows) {
      existingInFlightItemIds.add(existingRow.shipmentItemId);
      const desiredQuantity = desiredInFlightByShipmentItemId.get(existingRow.shipmentItemId) ?? 0;
      if (desiredQuantity === 0) {
        await tx
          .delete(in_flight)
          .where(
            and(eq(in_flight.id, existingRow.id), eq(in_flight.institution_id, institutionId)),
          );
        continue;
      }

      if (desiredQuantity !== existingRow.quantity) {
        await tx
          .update(in_flight)
          .set({ quantity: desiredQuantity, updated_at: new Date() })
          .where(
            and(eq(in_flight.id, existingRow.id), eq(in_flight.institution_id, institutionId)),
          );
      }
    }

    const newInFlightRows = Array.from(desiredInFlightByShipmentItemId.entries())
      .filter(
        ([shipmentItemId, quantity]) =>
          quantity > 0 && !existingInFlightItemIds.has(shipmentItemId),
      )
      .map(([shipmentItemId, quantity]) => ({
        institution_id: institutionId,
        release_event_id: releaseEventId,
        shipment_item_id: shipmentItemId,
        quantity,
      }));

    if (newInFlightRows.length > 0) {
      await tx.insert(in_flight).values(newInFlightRows);
    }

    const existingLossItemIds = new Set<number>();
    for (const existingRow of existingLossRows) {
      existingLossItemIds.add(existingRow.shipmentItemId);
      const desiredLosses =
        desiredLossByShipmentItemId.get(existingRow.shipmentItemId) ?? toLossValues();
      if (sumLossValues(desiredLosses) === 0) {
        await tx
          .delete(release_event_losses)
          .where(
            and(
              eq(release_event_losses.id, existingRow.id),
              eq(release_event_losses.institution_id, institutionId),
            ),
          );
        continue;
      }

      const currentLosses = toLossValues({
        damaged_in_transit: existingRow.damaged_in_transit,
        diseased_in_transit: existingRow.diseased_in_transit,
        parasite: existingRow.parasite,
        non_emergence: existingRow.non_emergence,
        poor_emergence: existingRow.poor_emergence,
      });

      if (LOSS_COLUMNS.some((column) => desiredLosses[column] !== currentLosses[column])) {
        await tx
          .update(release_event_losses)
          .set({ ...desiredLosses, updated_at: new Date() })
          .where(
            and(
              eq(release_event_losses.id, existingRow.id),
              eq(release_event_losses.institution_id, institutionId),
            ),
          );
      }
    }

    const newLossRows = Array.from(desiredLossByShipmentItemId.entries())
      .filter(
        ([shipmentItemId, losses]) =>
          sumLossValues(losses) > 0 && !existingLossItemIds.has(shipmentItemId),
      )
      .map(([shipmentItemId, losses]) => ({
        institution_id: institutionId,
        release_event_id: releaseEventId,
        shipment_item_id: shipmentItemId,
        ...losses,
      }));

    if (newLossRows.length > 0) {
      await tx.insert(release_event_losses).values(newLossRows);
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

    // Create flow accepts absolute loss totals; we apply those to
    // shipment_items and separately persist only positive per-event deltas.
    const lockedMutableItems = new Map(lockedItems.map((row) => [row.id, { ...row }]));
    const lossAttributionRows: Array<{ shipment_item_id: number } & LossValues> = [];
    for (const update of lossUpdates) {
      const row = lockedMutableItems.get(update.shipment_item_id);
      if (!row) {
        throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
      }

      const { absolutePatch, attributionDelta } = computeCreateLossDelta(
        {
          damaged_in_transit: row.damaged_in_transit,
          diseased_in_transit: row.diseased_in_transit,
          parasite: row.parasite,
          non_emergence: row.non_emergence,
          poor_emergence: row.poor_emergence,
        },
        update,
      );

      if (Object.keys(absolutePatch).length === 0) continue;

      // Keep in-memory row in sync with the absolute write so remaining checks
      // below read post-update source-of-truth values.
      for (const [column, value] of Object.entries(absolutePatch) as Array<[LossColumn, number]>) {
        row[column] = value;
      }

      await tx
        .update(shipment_items)
        .set({ ...absolutePatch, updated_at: new Date() })
        .where(
          and(
            eq(shipment_items.id, update.shipment_item_id),
            eq(shipment_items.institution_id, institutionId),
          ),
        );

      const totalDelta = Object.values(attributionDelta).reduce(
        (sum, value) => sum + (typeof value === "number" ? value : 0),
        0,
      );

      if (totalDelta > 0) {
        lossAttributionRows.push({
          shipment_item_id: update.shipment_item_id,
          damaged_in_transit: attributionDelta.damaged_in_transit ?? 0,
          diseased_in_transit: attributionDelta.diseased_in_transit ?? 0,
          parasite: attributionDelta.parasite ?? 0,
          non_emergence: attributionDelta.non_emergence ?? 0,
          poor_emergence: attributionDelta.poor_emergence ?? 0,
        });
      }
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

    const inFlightRows =
      payload.items.length > 0
        ? await tx
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
            })
        : [];

    if (lossAttributionRows.length > 0) {
      await tx.insert(release_event_losses).values(
        lossAttributionRows.map((row) => ({
          institution_id: institutionId,
          release_event_id: releaseEvent.id,
          shipment_item_id: row.shipment_item_id,
          damaged_in_transit: row.damaged_in_transit,
          diseased_in_transit: row.diseased_in_transit,
          parasite: row.parasite,
          non_emergence: row.non_emergence,
          poor_emergence: row.poor_emergence,
        })),
      );
    }

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

    const relatedInFlightItems = await tx
      .select({ shipmentItemId: in_flight.shipment_item_id })
      .from(in_flight)
      .where(
        and(
          eq(in_flight.institution_id, institutionId),
          eq(in_flight.release_event_id, releaseEventId),
        ),
      );

    const relatedLossRows = await tx
      .select({
        shipmentItemId: release_event_losses.shipment_item_id,
        damaged_in_transit: release_event_losses.damaged_in_transit,
        diseased_in_transit: release_event_losses.diseased_in_transit,
        parasite: release_event_losses.parasite,
        non_emergence: release_event_losses.non_emergence,
        poor_emergence: release_event_losses.poor_emergence,
      })
      .from(release_event_losses)
      .where(
        and(
          eq(release_event_losses.institution_id, institutionId),
          eq(release_event_losses.release_event_id, releaseEventId),
        ),
      );

    const shipmentItemIds = Array.from(
      new Set([
        ...relatedInFlightItems.map((row) => row.shipmentItemId),
        ...relatedLossRows.map((row) => row.shipmentItemId),
      ]),
    );

    let lockedShipmentItems: Array<{
      id: number;
      damaged_in_transit: number;
      diseased_in_transit: number;
      parasite: number;
      non_emergence: number;
      poor_emergence: number;
    }> = [];
    if (shipmentItemIds.length > 0) {
      lockedShipmentItems = await tx
        .select({
          id: shipment_items.id,
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
            inArray(shipment_items.id, shipmentItemIds),
          ),
        )
        .for("update");

      if (lockedShipmentItems.length !== shipmentItemIds.length) {
        throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
      }
    }

    if (relatedLossRows.length > 0) {
      const lockedById = new Map(lockedShipmentItems.map((row) => [row.id, row]));

      for (const lossRow of relatedLossRows) {
        const locked = lockedById.get(lossRow.shipmentItemId);
        if (!locked) {
          throw new Error(RELEASE_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
        }

        const patch = computeDeleteLossRollbackPatch(
          toLossValues({
            damaged_in_transit: locked.damaged_in_transit,
            diseased_in_transit: locked.diseased_in_transit,
            parasite: locked.parasite,
            non_emergence: locked.non_emergence,
            poor_emergence: locked.poor_emergence,
          }),
          toLossValues({
            damaged_in_transit: lossRow.damaged_in_transit,
            diseased_in_transit: lossRow.diseased_in_transit,
            parasite: lossRow.parasite,
            non_emergence: lossRow.non_emergence,
            poor_emergence: lossRow.poor_emergence,
          }),
        );

        await tx
          .update(shipment_items)
          .set({ ...patch, updated_at: new Date() })
          .where(
            and(
              eq(shipment_items.id, lossRow.shipmentItemId),
              eq(shipment_items.institution_id, institutionId),
            ),
          );
      }
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
