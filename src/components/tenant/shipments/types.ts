/**
 * Shared shapes for the tenant shipment + release UIs.
 *
 * Field names match what the tenant API actually returns (camelCase) so
 * components don't have to translate at the boundary.
 */

export type SpeciesPickerOption = {
  id: number;
  scientificName: string;
  commonName: string;
  family: string;
  imgWingsOpen: string | null;
};

export type ShipmentListRow = {
  id: number;
  supplierCode: string;
  shipmentDate: string;
  arrivalDate: string;
  createdAt: string;
  remaining: number;
  isCompleted: boolean;
};

export type ShipmentItemRow = {
  id: number;
  butterflySpeciesId: number;
  scientificName: string;
  commonName: string;
  imageOpen: string | null;
  imageClosed: string | null;
  numberReceived: number;
  emergedInTransit: number;
  damagedInTransit: number;
  diseasedInTransit: number;
  parasite: number;
  nonEmergence: number;
  poorEmergence: number;
  inFlightQuantity: number;
};

export type ShipmentDetailHeader = {
  id: number;
  supplierCode: string;
  shipmentDate: string;
  arrivalDate: string;
  createdAt: string;
};

export type ShipmentDetailResponse = {
  shipment: ShipmentDetailHeader;
  items: ShipmentItemRow[];
};

export type ReleaseHistoryRow = {
  id: number;
  shipmentId: number;
  supplierCode: string;
  shipmentDate: string;
  releaseDate: string;
  releasedBy: string;
  totalReleased: number;
  totalLosses: number;
};

export type ReleaseEventDetail = {
  event: {
    id: number;
    shipmentId: number;
    releaseDate: string;
    releasedBy: string;
  };
  items: { id: number; shipmentItemId: number; quantity: number }[];
  losses: {
    id: number;
    shipmentItemId: number;
    damagedInTransit: number;
    diseasedInTransit: number;
    parasite: number;
    nonEmergence: number;
    poorEmergence: number;
  }[];
};

/**
 * Compute the remaining (releasable) butterflies for a single shipment item:
 * received minus all loss columns minus any quantity already in_flight.
 * Mirrors `calculateRemaining()` in `src/lib/queries/releases.ts`.
 */
export function computeItemRemaining(item: ShipmentItemRow): number {
  const grossAvailable =
    item.numberReceived -
    item.damagedInTransit -
    item.diseasedInTransit -
    item.parasite -
    item.nonEmergence -
    item.poorEmergence;

  return Math.max(0, grossAvailable - item.inFlightQuantity);
}
