import { and, desc, eq, inArray, sql, count } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  shipments,
  shipment_items,
  butterfly_species,
  in_flight,
  release_events,
} from "@/lib/schema";

import type { CreateShipmentBody, UpdateShipmentBody } from "@/lib/validation/shipments";

export const SHIPMENT_ERRORS = {
  CANNOT_DELETE_ITEM_IN_FLIGHT: "CANNOT_DELETE_ITEM_IN_FLIGHT",
  INVALID_INVENTORY_REDUCTION: "INVALID_INVENTORY_REDUCTION",
  SHIPMENT_ITEM_NOT_FOUND: "SHIPMENT_ITEM_NOT_FOUND",
  CANNOT_DELETE_SHIPMENT_WITH_DEPENDENCIES: "CANNOT_DELETE_SHIPMENT_WITH_DEPENDENCIES",
} as const;

/**
 * List shipments for a tenant (paginated)
 */
export async function listShipments(institutionId: number, page: number, limit: number) {
  const offset = (page - 1) * limit;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: shipments.id,
        supplierCode: shipments.supplier_code,
        shipmentDate: shipments.shipment_date,
        arrivalDate: shipments.arrival_date,
        createdAt: shipments.created_at,
      })
      .from(shipments)
      .where(eq(shipments.institution_id, institutionId))
      .orderBy(desc(shipments.shipment_date))
      .limit(limit)
      .offset(offset),

    db
      .select({ total: count() })
      .from(shipments)
      .where(eq(shipments.institution_id, institutionId)),
  ]);

  const total = totalResult[0]?.total ?? 0;

  return {
    shipments: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Fetch shipment with line items
 */
export async function getShipmentWithItems(institutionId: number, shipmentId: number) {
  const [shipment] = await db
    .select({
      id: shipments.id,
      supplierCode: shipments.supplier_code,
      shipmentDate: shipments.shipment_date,
      arrivalDate: shipments.arrival_date,
      createdAt: shipments.created_at,
    })
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.institution_id, institutionId)))
    .limit(1);

  if (!shipment) return null;

  const items = await db
    .select({
      id: shipment_items.id,

      butterflySpeciesId: shipment_items.butterfly_species_id,

      scientificName: butterfly_species.scientific_name,
      commonName: butterfly_species.common_name,

      imageOpen: butterfly_species.img_wings_open,
      imageClosed: butterfly_species.img_wings_closed,

      numberReceived: shipment_items.number_received,
      emergedInTransit: shipment_items.emerged_in_transit,
      damagedInTransit: shipment_items.damaged_in_transit,
      diseasedInTransit: shipment_items.diseased_in_transit,
      parasite: shipment_items.parasite,
      nonEmergence: shipment_items.non_emergence,
      poorEmergence: shipment_items.poor_emergence,

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
    .where(
      and(
        eq(shipment_items.shipment_id, shipmentId),
        eq(shipment_items.institution_id, institutionId),
      ),
    )
    .groupBy(
      shipment_items.id,
      shipment_items.butterfly_species_id,
      butterfly_species.scientific_name,
      butterfly_species.common_name,
      butterfly_species.img_wings_open,
      butterfly_species.img_wings_closed,
    );

  return { shipment, items };
}

/**
 * Create shipment with line items
 */
export async function createShipment(institutionId: number, payload: CreateShipmentBody) {
  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(shipments)
      .values({
        institution_id: institutionId,
        supplier_code: payload.supplier_code,
        shipment_date: payload.shipment_date,
        arrival_date: payload.arrival_date,
      })
      .returning({ id: shipments.id });

    const items = payload.items.map((item) => ({
      institution_id: institutionId,
      shipment_id: inserted.id,
      butterfly_species_id: item.butterfly_species_id,
      number_received: item.number_received,
      emerged_in_transit: item.emerged_in_transit,
      damaged_in_transit: item.damaged_in_transit,
      diseased_in_transit: item.diseased_in_transit,
      parasite: item.parasite,
      non_emergence: item.non_emergence,
      poor_emergence: item.poor_emergence,
    }));

    await tx.insert(shipment_items).values(items);

    return inserted.id;
  });
}

/**
 * Update shipment header or items
 */
export async function updateShipment(
  institutionId: number,
  shipmentId: number,
  payload: UpdateShipmentBody,
) {
  return db.transaction(async (tx) => {
    // Determine whether the shipment header exists up front so the route can
    // return 404 when there is nothing to update.
    const [existingShipment] = await tx
      .select({ id: shipments.id })
      .from(shipments)
      .where(and(eq(shipments.id, shipmentId), eq(shipments.institution_id, institutionId)))
      .limit(1);

    if (!existingShipment) return false;

    if (payload.supplier_code || payload.shipment_date || payload.arrival_date) {
      const updateData: Record<string, unknown> = {};

      if (payload.supplier_code) updateData.supplier_code = payload.supplier_code;
      if (payload.shipment_date) updateData.shipment_date = payload.shipment_date;
      if (payload.arrival_date) updateData.arrival_date = payload.arrival_date;

      await tx
        .update(shipments)
        .set(updateData)
        .where(and(eq(shipments.id, shipmentId), eq(shipments.institution_id, institutionId)));
    }

    if (payload.update_items) {
      for (const item of payload.update_items) {
        // Lock the row to serialize with concurrent release creation (which also locks shipment_items)
        const lockedRows = await tx
          .select({ id: shipment_items.id })
          .from(shipment_items)
          .where(
            and(
              eq(shipment_items.id, item.id),
              eq(shipment_items.institution_id, institutionId),
              eq(shipment_items.shipment_id, shipmentId),
            ),
          )
          .for("update");

        if (lockedRows.length === 0) {
          throw new Error(SHIPMENT_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
        }

        const [inFlightRow] = await tx
          .select({ total: sql<number>`coalesce(sum(${in_flight.quantity}), 0)` })
          .from(in_flight)
          .where(
            and(
              eq(in_flight.shipment_item_id, item.id),
              eq(in_flight.institution_id, institutionId),
            ),
          );

        const inFlightTotal = inFlightRow?.total ?? 0;

        const availableAfterUpdate =
          item.number_received -
          item.damaged_in_transit -
          item.diseased_in_transit -
          item.parasite -
          item.non_emergence -
          item.poor_emergence;

        if (availableAfterUpdate < inFlightTotal) {
          throw new Error(SHIPMENT_ERRORS.INVALID_INVENTORY_REDUCTION);
        }

        await tx
          .update(shipment_items)
          .set({
            number_received: item.number_received,
            emerged_in_transit: item.emerged_in_transit,
            damaged_in_transit: item.damaged_in_transit,
            diseased_in_transit: item.diseased_in_transit,
            parasite: item.parasite,
            non_emergence: item.non_emergence,
            poor_emergence: item.poor_emergence,
          })
          .where(
            and(
              eq(shipment_items.id, item.id),
              eq(shipment_items.institution_id, institutionId),
              eq(shipment_items.shipment_id, shipmentId),
            ),
          );
      }
    }

    if (payload.add_items) {
      const rows = payload.add_items.map((item) => ({
        institution_id: institutionId,
        shipment_id: shipmentId,
        butterfly_species_id: item.butterfly_species_id,
        number_received: item.number_received,
        emerged_in_transit: item.emerged_in_transit,
        damaged_in_transit: item.damaged_in_transit,
        diseased_in_transit: item.diseased_in_transit,
        parasite: item.parasite,
        non_emergence: item.non_emergence,
        poor_emergence: item.poor_emergence,
      }));

      await tx.insert(shipment_items).values(rows);
    }

    if (payload.delete_items) {
      const rows = await tx
        .select({
          shipmentItemId: in_flight.shipment_item_id,
        })
        .from(in_flight)
        .where(
          and(
            eq(in_flight.institution_id, institutionId),
            inArray(in_flight.shipment_item_id, payload.delete_items),
          ),
        );

      if (rows.length > 0) {
        throw new Error(SHIPMENT_ERRORS.CANNOT_DELETE_ITEM_IN_FLIGHT);
      }

      const deleted = await tx
        .delete(shipment_items)
        .where(
          and(
            eq(shipment_items.institution_id, institutionId),
            eq(shipment_items.shipment_id, shipmentId),
            inArray(shipment_items.id, payload.delete_items),
          ),
        )
        .returning({ id: shipment_items.id });

      if (deleted.length !== payload.delete_items.length) {
        throw new Error(SHIPMENT_ERRORS.SHIPMENT_ITEM_NOT_FOUND);
      }
    }

    return true;
  });
}

/**
 * Delete single shipment
 *
 * Blocked if shipment_items or release_events exist for this shipment.
 */
export async function deleteShipment(institutionId: number, shipmentId: number) {
  const [itemRow] = await db
    .select({ id: shipment_items.id })
    .from(shipment_items)
    .where(
      and(
        eq(shipment_items.shipment_id, shipmentId),
        eq(shipment_items.institution_id, institutionId),
      ),
    )
    .limit(1);

  if (itemRow) {
    throw new Error(SHIPMENT_ERRORS.CANNOT_DELETE_SHIPMENT_WITH_DEPENDENCIES);
  }

  const [releaseRow] = await db
    .select({ id: release_events.id })
    .from(release_events)
    .where(
      and(
        eq(release_events.shipment_id, shipmentId),
        eq(release_events.institution_id, institutionId),
      ),
    )
    .limit(1);

  if (releaseRow) {
    throw new Error(SHIPMENT_ERRORS.CANNOT_DELETE_SHIPMENT_WITH_DEPENDENCIES);
  }

  const result = await db
    .delete(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.institution_id, institutionId)))
    .returning({ id: shipments.id });

  return result.length > 0;
}

/**
 * TESTING ONLY
 *
 * Bulk delete shipments for tenant.
 */
export async function bulkDeleteShipmentsForTenant(institutionId: number) {
  return db.delete(shipments).where(eq(shipments.institution_id, institutionId));
}
