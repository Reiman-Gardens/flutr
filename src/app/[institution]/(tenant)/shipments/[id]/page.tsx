"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ShipmentHeader = {
  id: number;
  supplierCode: string;
  shipmentDate: string;
  arrivalDate: string;
  createdAt: string;
};

type ShipmentItem = {
  id: number;
  butterflySpeciesId: number;
  scientificName: string;
  commonName?: string | null;
  imageUrl?: string | null;
  imageOpen?: string | null;
  imageClosed?: string | null;
  numberReceived: number;
  emergedInTransit: number;
  damagedInTransit: number;
  diseasedInTransit: number;
  parasite: number;
  nonEmergence: number;
  poorEmergence: number;
  inFlightQuantity: number;
};

type ShipmentDetailResponse = {
  shipment: ShipmentHeader;
  items: ShipmentItem[];
  releaseEvents?: Array<{
    id?: number;
    releaseId?: number;
    release_date?: string;
    releaseDate?: string;
  }>;
  releases?: Array<{
    id?: number;
    releaseId?: number;
    release_date?: string;
    releaseDate?: string;
  }>;
  inFlight?: Array<{ releaseEventId?: number; release_event_id?: number }>;
};

type ShipmentMetricField =
  | "numberReceived"
  | "emergedInTransit"
  | "damagedInTransit"
  | "diseasedInTransit"
  | "parasite"
  | "nonEmergence"
  | "poorEmergence";

type ReleaseDraft = {
  goodEmergence: number;
  poorEmergence: number;
};

type ReleaseEventItem = {
  inFlightId: number | null;
  shipmentItemId: number;
  quantity: number;
  goodEmergence: number;
  poorEmergence: number;
};

type ReleaseEventDetail = {
  id: number;
  releaseDate: string;
  items: ReleaseEventItem[];
};

type ReleaseEditorRow = {
  inFlightId: number | null;
  shipmentItemId: number;
  goodEmergence: number;
  poorEmergence: number;
};

type SpeciesOption = {
  butterflySpeciesId: number;
  scientificName: string;
  commonName: string;
  imageUrl?: string | null;
  imageOpen?: string | null;
  imageClosed?: string | null;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getRemaining = (item: ShipmentItem) => {
  return (
    item.numberReceived -
    item.emergedInTransit -
    item.damagedInTransit -
    item.diseasedInTransit -
    item.parasite -
    item.nonEmergence -
    item.poorEmergence -
    item.inFlightQuantity
  );
};

const getAvailableToRelease = (item: ShipmentItem) => {
  return Math.max(0, getRemaining(item));
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
};

const toNonNegativeInt = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
};

const toPositiveInt = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : null;
};

const getShipmentItemImageUrl = (item: ShipmentItem) => {
  return item.imageUrl ?? item.imageOpen ?? item.imageClosed ?? null;
};

const resolveCommonName = (commonName: string | null | undefined, scientificName: string) => {
  if (typeof commonName !== "string") return scientificName;
  const normalized = commonName.trim();
  return normalized.length > 0 ? normalized : scientificName;
};

const uniquePositiveIds = (ids: Array<number | null>) => {
  return Array.from(
    new Set(
      ids.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0),
    ),
  );
};

type CreatedInFlightRow = {
  inFlightId: number;
  shipmentItemId: number;
  quantity: number;
};

const extractCreatedInFlightRowsFromCreateResponse = (payload: unknown) => {
  const root = asRecord(payload);
  if (!root) return [] as CreatedInFlightRow[];

  const release = asRecord(root.release);
  const rows = Array.isArray(release?.items)
    ? release.items
    : Array.isArray(root.items)
      ? root.items
      : [];

  return rows
    .map((row) => {
      const item = asRecord(row);
      if (!item) return null;

      const inFlightId = toPositiveInt(item.id);
      const shipmentItemId =
        toPositiveInt(item.shipmentItemId) ?? toPositiveInt(item.shipment_item_id);
      const quantity = toNonNegativeInt(item.quantity);

      if (!inFlightId || !shipmentItemId) return null;

      return {
        inFlightId,
        shipmentItemId,
        quantity,
      } satisfies CreatedInFlightRow;
    })
    .filter((row): row is CreatedInFlightRow => row !== null);
};

const normalizeReleaseEvent = (payload: unknown, fallbackId: number): ReleaseEventDetail | null => {
  const root = asRecord(payload);
  if (!root) return null;

  const event = asRecord(root.event) ?? asRecord(root.releaseEvent) ?? root;
  const id = toPositiveInt(event.id) ?? toPositiveInt(root.releaseId) ?? fallbackId;

  if (!id) return null;

  const releaseDateValue =
    event.releaseDate ?? event.release_date ?? root.releaseDate ?? root.release_date;

  const releaseDate =
    typeof releaseDateValue === "string" && releaseDateValue.length > 0
      ? releaseDateValue
      : new Date().toISOString();

  const rows = Array.isArray(root.items) ? root.items : [];

  const items: ReleaseEventItem[] = rows
    .map((row) => {
      const item = asRecord(row);
      if (!item) return null;

      const shipmentItemId =
        toPositiveInt(item.shipmentItemId) ?? toPositiveInt(item.shipment_item_id);
      if (!shipmentItemId) return null;

      const quantity = toNonNegativeInt(item.quantity);
      const goodEmergence = toNonNegativeInt(
        item.goodEmergence ?? item.good_emergence ?? item.quantity,
      );
      const poorEmergence = toNonNegativeInt(item.poorEmergence ?? item.poor_emergence);
      const inFlightId = toPositiveInt(item.id);

      return {
        inFlightId,
        shipmentItemId,
        quantity,
        goodEmergence,
        poorEmergence,
      };
    })
    .filter((item): item is ReleaseEventItem => item !== null);

  return {
    id,
    releaseDate,
    items,
  };
};

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    const root = asRecord(payload);
    const nestedError = root ? asRecord(root.error) : null;

    if (nestedError && typeof nestedError.message === "string" && nestedError.message.length > 0) {
      return nestedError.message;
    }

    if (root && typeof root.message === "string" && root.message.length > 0) {
      return root.message;
    }
  } catch {
    return fallback;
  }

  return fallback;
};

function QuantityStepper({
  value,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  disabled,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 w-7 p-0 text-xs"
        onClick={onDecrement}
        disabled={disabled}
        aria-label={decrementLabel}
      >
        -
      </Button>
      <span className="min-w-6 text-center text-xs font-medium">{value}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 w-7 p-0 text-xs"
        onClick={onIncrement}
        disabled={disabled}
        aria-label={incrementLabel}
      >
        +
      </Button>
    </div>
  );
}

export default function ShipmentDetailPage() {
  const params = useParams<{ institution: string; id: string }>();
  const rawInstitutionSlug = params?.institution ?? "";
  const institutionSlug = Array.isArray(rawInstitutionSlug)
    ? (rawInstitutionSlug[0] ?? "")
    : rawInstitutionSlug;
  const rawShipmentId = params?.id ?? "";
  const shipmentId = Array.isArray(rawShipmentId) ? rawShipmentId[0] : rawShipmentId;
  const shipmentIdNumber = Number(shipmentId);
  const [activeTab, setActiveTab] = useState<"items" | "releases" | "inflight">("items");

  const [detail, setDetail] = useState<ShipmentDetailResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [saveItemsStatus, setSaveItemsStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const [saveItemsMessage, setSaveItemsMessage] = useState<string | null>(null);

  const [releaseDrafts, setReleaseDrafts] = useState<Record<number, ReleaseDraft>>({});
  const [releaseStatus, setReleaseStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const [releaseMessage, setReleaseMessage] = useState<string | null>(null);

  const [releaseEvents, setReleaseEvents] = useState<ReleaseEventDetail[]>([]);
  const [releaseHistoryStatus, setReleaseHistoryStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [releaseHistoryMessage, setReleaseHistoryMessage] = useState<string | null>(null);

  const [editingReleaseId, setEditingReleaseId] = useState<number | null>(null);
  const [editingRows, setEditingRows] = useState<ReleaseEditorRow[]>([]);
  const [editingDeleteInFlightIds, setEditingDeleteInFlightIds] = useState<number[]>([]);
  const [editReleaseStatus, setEditReleaseStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [editReleaseMessage, setEditReleaseMessage] = useState<string | null>(null);

  const [inFlightEdits, setInFlightEdits] = useState<Record<number, number>>({});
  const [inFlightStatus, setInFlightStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const [inFlightMessage, setInFlightMessage] = useState<string | null>(null);
  const [deletedItemIds, setDeletedItemIds] = useState<number[]>([]);
  const [nextTempItemId, setNextTempItemId] = useState(-1);
  const [speciesOptions, setSpeciesOptions] = useState<SpeciesOption[]>([]);
  const [nameDisplayMode, setNameDisplayMode] = useState<"scientific" | "common">("scientific");

  const tenantHeaders = useMemo(() => ({ "x-tenant-slug": institutionSlug }), [institutionSlug]);

  const fetchDetail = useCallback(async () => {
    const response = await fetch(`/api/tenant/shipments/${shipmentIdNumber}`, {
      headers: tenantHeaders,
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Unable to load shipment"));
    }

    const data = await response.json();
    return data as ShipmentDetailResponse;
  }, [shipmentIdNumber, tenantHeaders]);

  const loadSpeciesOptions = useCallback(async () => {
    try {
      const response = await fetch("/api/tenant/species", {
        headers: tenantHeaders,
      });
      if (!response.ok) return;

      const payload = await response.json();
      const root = asRecord(payload);
      const rows = Array.isArray(root?.species) ? root.species : [];

      const parsed = rows
        .map((row): SpeciesOption | null => {
          const item = asRecord(row);
          if (!item) return null;

          const id = toPositiveInt(item.id);
          const scientificName =
            typeof item.scientificName === "string" ? item.scientificName.trim() : "";

          if (!id || scientificName.length === 0) return null;

          const commonNameOverride =
            typeof item.commonNameOverride === "string" ? item.commonNameOverride : null;
          const commonNameBase = typeof item.commonName === "string" ? item.commonName : null;

          return {
            butterflySpeciesId: id,
            scientificName,
            commonName: resolveCommonName(commonNameOverride ?? commonNameBase, scientificName),
            imageOpen:
              typeof item.imgWingsOpen === "string" && item.imgWingsOpen.length > 0
                ? item.imgWingsOpen
                : null,
            imageClosed:
              typeof item.imgWingsClosed === "string" && item.imgWingsClosed.length > 0
                ? item.imgWingsClosed
                : null,
            imageUrl:
              typeof item.imgWingsOpen === "string" && item.imgWingsOpen.length > 0
                ? item.imgWingsOpen
                : typeof item.imgWingsClosed === "string" && item.imgWingsClosed.length > 0
                  ? item.imgWingsClosed
                  : null,
          };
        })
        .filter((item): item is SpeciesOption => item !== null);

      if (parsed.length > 0) {
        setSpeciesOptions(parsed);
      }
    } catch {
      // Keep existing fallback behavior from shipment-detail rows.
    }
  }, [tenantHeaders]);

  const loadDetail = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const data = await fetchDetail();
      setDetail(data);

      const releaseDraftMap: Record<number, ReleaseDraft> = {};
      data.items.forEach((item) => {
        releaseDraftMap[item.id] = {
          goodEmergence: 0,
          poorEmergence: 0,
        };
      });
      setReleaseDrafts(releaseDraftMap);

      setDeletedItemIds([]);
      setNextTempItemId(-1);

      setStatus("idle");
      return data;
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to load shipment");
      return null;
    }
  }, [fetchDetail]);

  useEffect(() => {
    if (!institutionSlug) {
      setStatus("error");
      setErrorMessage("Missing institution slug");
      return;
    }

    if (!Number.isFinite(shipmentIdNumber) || shipmentIdNumber <= 0) {
      setStatus("error");
      setErrorMessage("Invalid shipment id");
      return;
    }

    void loadDetail();
    void loadSpeciesOptions();
  }, [institutionSlug, loadDetail, loadSpeciesOptions, shipmentIdNumber]);

  const releaseRouteUrl = useCallback(
    (releaseId: number) => `/api/tenant/releases/${releaseId}`,
    [],
  );

  const fetchReleases = useCallback(async () => {
    setReleaseHistoryStatus("loading");
    setReleaseHistoryMessage(null);

    try {
      const listRes = await fetch(`/api/tenant/shipments/${shipmentIdNumber}/releases`, {
        headers: tenantHeaders,
      });
      if (!listRes.ok) {
        throw new Error(await readErrorMessage(listRes, "Failed to load releases"));
      }

      const listData = await listRes.json();
      const releaseIds: number[] = (
        Array.isArray(listData?.releaseEvents) ? listData.releaseEvents : []
      )
        .map((e: unknown) => toPositiveInt(asRecord(e)?.id))
        .filter((id: number | null): id is number => id !== null);

      if (releaseIds.length === 0) {
        setReleaseEvents([]);
        setReleaseHistoryStatus("idle");
        setReleaseHistoryMessage(null);
        return;
      }

      const responses = await Promise.all(
        releaseIds.map(async (releaseId) => {
          const response = await fetch(releaseRouteUrl(releaseId), {
            headers: tenantHeaders,
          });
          if (!response.ok) {
            throw new Error(
              await readErrorMessage(response, `Failed to load release ${releaseId}`),
            );
          }

          const payload = await response.json();
          return normalizeReleaseEvent(payload, releaseId);
        }),
      );

      const normalized = responses
        .filter((event): event is ReleaseEventDetail => event !== null)
        .sort((a, b) => new Date(b.releaseDate).valueOf() - new Date(a.releaseDate).valueOf());

      setReleaseEvents(normalized);
      setReleaseHistoryStatus("idle");
    } catch (error) {
      setReleaseHistoryStatus("error");
      setReleaseHistoryMessage(
        error instanceof Error ? error.message : "Failed to load release history",
      );
    }
  }, [shipmentIdNumber, releaseRouteUrl, tenantHeaders]);

  useEffect(() => {
    if (!Number.isFinite(shipmentIdNumber) || shipmentIdNumber <= 0) return;
    void fetchReleases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentIdNumber]);

  const fallbackSpeciesOptions = useMemo(() => {
    if (!detail) return [];

    const map = new Map<number, SpeciesOption>();

    detail.items.forEach((item) => {
      if (!map.has(item.butterflySpeciesId)) {
        map.set(item.butterflySpeciesId, {
          butterflySpeciesId: item.butterflySpeciesId,
          scientificName: item.scientificName,
          commonName: resolveCommonName(item.commonName, item.scientificName),
          imageUrl: item.imageUrl,
          imageOpen: item.imageOpen,
          imageClosed: item.imageClosed,
        });
      }
    });

    return Array.from(map.values());
  }, [detail]);

  const availableSpeciesOptions = useMemo(() => {
    if (speciesOptions.length > 0) return speciesOptions;
    return fallbackSpeciesOptions;
  }, [fallbackSpeciesOptions, speciesOptions]);

  const getDisplayName = useCallback(
    (entry: { scientificName: string; commonName?: string | null }) => {
      if (nameDisplayMode === "common") {
        return resolveCommonName(entry.commonName, entry.scientificName);
      }

      return entry.scientificName;
    },
    [nameDisplayMode],
  );

  const updateItemSpecies = (itemId: number, butterflySpeciesId: number) => {
    const selectedSpecies = availableSpeciesOptions.find(
      (option) => option.butterflySpeciesId === butterflySpeciesId,
    );
    if (!selectedSpecies) return;

    setDetail((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        items: prev.items.map((item) => {
          if (item.id !== itemId) return item;

          return {
            ...item,
            butterflySpeciesId: selectedSpecies.butterflySpeciesId,
            scientificName: selectedSpecies.scientificName,
            commonName: selectedSpecies.commonName,
            imageUrl: selectedSpecies.imageUrl,
            imageOpen: selectedSpecies.imageOpen,
            imageClosed: selectedSpecies.imageClosed,
          };
        }),
      };
    });
  };

  const handleAddShipmentItem = () => {
    if (!detail || availableSpeciesOptions.length === 0) return;

    const selectedSpecies = availableSpeciesOptions[0];
    const tempId = nextTempItemId;

    setDetail((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            id: tempId,
            butterflySpeciesId: selectedSpecies.butterflySpeciesId,
            scientificName: selectedSpecies.scientificName,
            commonName: selectedSpecies.commonName,
            imageUrl: selectedSpecies.imageUrl,
            imageOpen: selectedSpecies.imageOpen,
            imageClosed: selectedSpecies.imageClosed,
            numberReceived: 0,
            emergedInTransit: 0,
            damagedInTransit: 0,
            diseasedInTransit: 0,
            parasite: 0,
            nonEmergence: 0,
            poorEmergence: 0,
            inFlightQuantity: 0,
          },
        ],
      };
    });

    setNextTempItemId((prev) => prev - 1);
  };

  const handleDeleteShipmentItem = (itemId: number) => {
    setDetail((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== itemId),
      };
    });

    setReleaseDrafts((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    if (itemId > 0) {
      setDeletedItemIds((prev) => Array.from(new Set([...prev, itemId])));
    }
  };

  const syncAfterMutation = useCallback(async () => {
    await loadDetail();
    await fetchReleases();
  }, [loadDetail, fetchReleases]);

  const updateMetric = (itemId: number, field: ShipmentMetricField, delta: number) => {
    setDetail((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        items: prev.items.map((item) => {
          if (item.id !== itemId) return item;

          const nextValue = Math.max(0, item[field] + delta);
          return {
            ...item,
            [field]: nextValue,
          };
        }),
      };
    });
  };

  const handleSaveShipmentItems = async () => {
    if (!detail) return;

    setSaveItemsStatus("saving");
    setSaveItemsMessage(null);

    try {
      const persistedItems = detail.items.filter((item) => item.id > 0);
      const newItems = detail.items.filter((item) => item.id <= 0);

      const payload: {
        update_items?: Array<{
          id: number;
          number_received: number;
          emerged_in_transit: number;
          damaged_in_transit: number;
          diseased_in_transit: number;
          parasite: number;
          non_emergence: number;
          poor_emergence: number;
        }>;
        add_items?: Array<{
          butterfly_species_id: number;
          number_received: number;
          emerged_in_transit: number;
          damaged_in_transit: number;
          diseased_in_transit: number;
          parasite: number;
          non_emergence: number;
          poor_emergence: number;
        }>;
        delete_items?: number[];
      } = {};

      if (persistedItems.length > 0) {
        payload.update_items = persistedItems.map((item) => ({
          id: item.id,
          number_received: item.numberReceived,
          emerged_in_transit: item.emergedInTransit,
          damaged_in_transit: item.damagedInTransit,
          diseased_in_transit: item.diseasedInTransit,
          parasite: item.parasite,
          non_emergence: item.nonEmergence,
          poor_emergence: item.poorEmergence,
        }));
      }

      if (newItems.length > 0) {
        payload.add_items = newItems.map((item) => ({
          butterfly_species_id: item.butterflySpeciesId,
          number_received: item.numberReceived,
          emerged_in_transit: item.emergedInTransit,
          damaged_in_transit: item.damagedInTransit,
          diseased_in_transit: item.diseasedInTransit,
          parasite: item.parasite,
          non_emergence: item.nonEmergence,
          poor_emergence: item.poorEmergence,
        }));
      }

      const normalizedDeleteItemIds = uniquePositiveIds(deletedItemIds);

      if (normalizedDeleteItemIds.length > 0) {
        payload.delete_items = normalizedDeleteItemIds;
      }

      if (!payload.update_items && !payload.add_items && !payload.delete_items) {
        setSaveItemsStatus("success");
        setSaveItemsMessage("No shipment item changes to save");
        return;
      }

      console.log("Saving shipment PATCH payload", payload);

      const response = await fetch(`/api/tenant/shipments/${shipmentIdNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to update shipment metrics"));
      }

      setDeletedItemIds([]);
      setNextTempItemId(-1);

      await syncAfterMutation();

      setSaveItemsStatus("success");
      setSaveItemsMessage("Shipment metrics updated");
    } catch (error) {
      setSaveItemsStatus("error");
      setSaveItemsMessage(
        error instanceof Error ? error.message : "Failed to update shipment metrics",
      );
    }
  };

  const releaseRows = useMemo(() => {
    if (!detail) return [];

    return detail.items
      .filter((item) => item.id > 0)
      .map((item) => {
        const draft = releaseDrafts[item.id] ?? { goodEmergence: 0, poorEmergence: 0 };
        return {
          item,
          available: getAvailableToRelease(item),
          draft,
        };
      });
  }, [detail, releaseDrafts]);

  const shipmentItemById = useMemo(() => {
    return new Map((detail?.items ?? []).map((item) => [item.id, item] as const));
  }, [detail]);

  const releaseSelections = useMemo(() => {
    return releaseRows
      .map((row) => ({
        shipment_item_id: row.item.id,
        quantity: row.draft.goodEmergence + row.draft.poorEmergence,
      }))
      .filter((row) => row.quantity > 0);
  }, [releaseRows]);

  const goodEmergenceByShipmentItemId = useMemo(() => {
    return new Map(releaseRows.map((row) => [row.item.id, row.draft.goodEmergence] as const));
  }, [releaseRows]);

  const poorEmergenceSelections = useMemo(() => {
    return releaseRows
      .map((row) => ({
        shipmentItemId: row.item.id,
        poorEmergence: row.draft.poorEmergence,
      }))
      .filter((row) => row.poorEmergence > 0);
  }, [releaseRows]);

  const hasReleaseDraftValues = useMemo(() => {
    return releaseRows.some((row) => row.draft.goodEmergence + row.draft.poorEmergence > 0);
  }, [releaseRows]);

  const updateReleaseDraft = (
    itemId: number,
    field: keyof ReleaseDraft,
    delta: number,
    available: number,
  ) => {
    setReleaseDrafts((prev) => {
      const current = prev[itemId] ?? { goodEmergence: 0, poorEmergence: 0 };
      const otherField: keyof ReleaseDraft =
        field === "goodEmergence" ? "poorEmergence" : "goodEmergence";
      const rawNextValue = Math.max(0, current[field] + delta);
      const maxAllowed = Math.max(0, available - current[otherField]);

      return {
        ...prev,
        [itemId]: {
          ...current,
          [field]: Math.min(rawNextValue, maxAllowed),
        },
      };
    });
  };

  const handleCreateRelease = async () => {
    if (!detail) return;
    if (!hasReleaseDraftValues) return;

    setReleaseStatus("saving");
    setReleaseMessage(null);

    try {
      let createdRelease = false;
      let normalizedInFlightToGoodOnly = false;
      let updatedPoorEmergenceMetrics = false;

      if (releaseSelections.length > 0) {
        const response = await fetch(`/api/tenant/shipments/${shipmentIdNumber}/releases`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tenantHeaders },
          body: JSON.stringify({
            items: releaseSelections,
          }),
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Failed to create release"));
        }

        const payload = await response.json();
        const createdInFlightRows = extractCreatedInFlightRowsFromCreateResponse(payload);

        for (const createdRow of createdInFlightRows) {
          const goodEmergenceTarget =
            goodEmergenceByShipmentItemId.get(createdRow.shipmentItemId) ?? 0;

          if (goodEmergenceTarget <= 0) {
            const deleteResponse = await fetch(`/api/tenant/in-flight/${createdRow.inFlightId}`, {
              method: "DELETE",
              headers: tenantHeaders,
            });

            if (!deleteResponse.ok) {
              throw new Error(
                await readErrorMessage(deleteResponse, "Failed to normalize in-flight rows"),
              );
            }

            normalizedInFlightToGoodOnly = true;
            continue;
          }

          if (goodEmergenceTarget !== createdRow.quantity) {
            const patchResponse = await fetch(`/api/tenant/in-flight/${createdRow.inFlightId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", ...tenantHeaders },
              body: JSON.stringify({ quantity: goodEmergenceTarget }),
            });

            if (!patchResponse.ok) {
              throw new Error(
                await readErrorMessage(patchResponse, "Failed to normalize in-flight rows"),
              );
            }

            normalizedInFlightToGoodOnly = true;
          }
        }

        createdRelease = true;
      }

      if (poorEmergenceSelections.length > 0) {
        const updateItems = poorEmergenceSelections
          .map((selection) => {
            const item = detail.items.find(
              (shipmentItem) => shipmentItem.id === selection.shipmentItemId,
            );
            if (!item || item.id <= 0) return null;

            return {
              id: item.id,
              number_received: item.numberReceived,
              emerged_in_transit: item.emergedInTransit,
              damaged_in_transit: item.damagedInTransit,
              diseased_in_transit: item.diseasedInTransit,
              parasite: item.parasite,
              non_emergence: item.nonEmergence,
              poor_emergence: item.poorEmergence + selection.poorEmergence,
            };
          })
          .filter(
            (
              item,
            ): item is {
              id: number;
              number_received: number;
              emerged_in_transit: number;
              damaged_in_transit: number;
              diseased_in_transit: number;
              parasite: number;
              non_emergence: number;
              poor_emergence: number;
            } => item !== null,
          );

        if (updateItems.length > 0) {
          const metricsResponse = await fetch(`/api/tenant/shipments/${shipmentIdNumber}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...tenantHeaders },
            body: JSON.stringify({
              update_items: updateItems,
            }),
          });

          if (!metricsResponse.ok) {
            throw new Error(
              await readErrorMessage(metricsResponse, "Failed to update poor emergence metrics"),
            );
          }

          updatedPoorEmergenceMetrics = true;
        }
      }

      await syncAfterMutation();

      setReleaseDrafts((prev) => {
        const next: Record<number, ReleaseDraft> = {};
        Object.keys(prev).forEach((key) => {
          const parsed = Number(key);
          if (Number.isFinite(parsed) && parsed > 0) {
            next[parsed] = { goodEmergence: 0, poorEmergence: 0 };
          }
        });
        return next;
      });

      setReleaseStatus("success");
      if (createdRelease && normalizedInFlightToGoodOnly && updatedPoorEmergenceMetrics) {
        setReleaseMessage(
          "Release created, in-flight normalized, and poor emergence metrics updated",
        );
      } else if (createdRelease && normalizedInFlightToGoodOnly) {
        setReleaseMessage("Release created and in-flight normalized to good emergence");
      } else if (createdRelease && updatedPoorEmergenceMetrics) {
        setReleaseMessage("Release created and poor emergence metrics updated");
      } else if (createdRelease) {
        setReleaseMessage("Release created");
      } else if (updatedPoorEmergenceMetrics) {
        setReleaseMessage("Poor emergence metrics updated");
      } else {
        setReleaseMessage("No release changes to create");
      }
    } catch (error) {
      setReleaseStatus("error");
      setReleaseMessage(error instanceof Error ? error.message : "Failed to create release");
    }
  };

  const releaseEventRows = useMemo(() => {
    return [...releaseEvents].sort(
      (a, b) => new Date(b.releaseDate).valueOf() - new Date(a.releaseDate).valueOf(),
    );
  }, [releaseEvents]);

  const releaseInFlightByShipmentItemId = useMemo(() => {
    const map = new Map<number, { inFlightId: number; quantity: number }>();

    releaseEvents.forEach((event) => {
      event.items.forEach((item) => {
        if (!item.inFlightId) return;

        const existing = map.get(item.shipmentItemId);
        if (!existing || item.inFlightId > existing.inFlightId) {
          map.set(item.shipmentItemId, {
            inFlightId: item.inFlightId,
            quantity: item.quantity,
          });
        }
      });
    });

    return map;
  }, [releaseEvents]);

  useEffect(() => {
    const next: Record<number, number> = {};

    releaseInFlightByShipmentItemId.forEach((row) => {
      next[row.inFlightId] = row.quantity;
    });

    setInFlightEdits(next);
  }, [releaseInFlightByShipmentItemId]);

  const handleDeleteRelease = async (releaseId: number) => {
    setReleaseStatus("saving");
    setReleaseMessage(null);

    try {
      const response = await fetch(releaseRouteUrl(releaseId), {
        method: "DELETE",
        headers: tenantHeaders,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to delete release"));
      }
      setReleaseEvents((prev) => prev.filter((event) => event.id !== releaseId));

      if (editingReleaseId === releaseId) {
        setEditingReleaseId(null);
        setEditingRows([]);
        setEditingDeleteInFlightIds([]);
      }

      await syncAfterMutation();

      setReleaseStatus("success");
      setReleaseMessage("Release deleted");
    } catch (error) {
      setReleaseStatus("error");
      setReleaseMessage(error instanceof Error ? error.message : "Failed to delete release");
    }
  };

  const startReleaseEditing = (releaseId: number) => {
    const release = releaseEvents.find((event) => event.id === releaseId);
    if (!release) return;

    setEditingReleaseId(release.id);
    setEditingDeleteInFlightIds([]);
    setEditingRows(
      release.items.map((item) => ({
        inFlightId: item.inFlightId,
        shipmentItemId: item.shipmentItemId,
        goodEmergence: item.goodEmergence,
        poorEmergence: item.poorEmergence,
      })),
    );

    setEditReleaseStatus("idle");
    setEditReleaseMessage(null);
  };

  const updateEditingRowMetric = (
    rowIndex: number,
    field: "goodEmergence" | "poorEmergence",
    delta: number,
  ) => {
    setEditingRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) return row;
        return {
          ...row,
          [field]: Math.max(0, row[field] + delta),
        };
      }),
    );
  };

  const updateEditingRowSpecies = (rowIndex: number, shipmentItemId: number) => {
    setEditingRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) return row;
        return {
          ...row,
          shipmentItemId,
        };
      }),
    );
  };

  const addEditingRow = () => {
    if (!detail) return;

    const availableRows = detail.items.filter((item) => item.id > 0);
    if (availableRows.length === 0) return;

    setEditingRows((prev) => {
      const used = new Set(prev.map((row) => row.shipmentItemId));
      const nextSpecies = availableRows.find((item) => !used.has(item.id)) ?? availableRows[0];

      return [
        ...prev,
        {
          inFlightId: null,
          shipmentItemId: nextSpecies.id,
          goodEmergence: 0,
          poorEmergence: 0,
        },
      ];
    });
  };

  const removeEditingRow = (rowIndex: number, inFlightId: number | null) => {
    if (inFlightId) {
      setEditingDeleteInFlightIds((prev) => uniquePositiveIds([...prev, inFlightId]));
    }

    setEditingRows((prev) => prev.filter((_, index) => index !== rowIndex));
  };

  const handleSaveReleaseEdit = async () => {
    if (!editingReleaseId) return;

    const rowsWithQuantity = editingRows
      .map((row) => ({
        inFlightId: row.inFlightId,
        shipment_item_id: row.shipmentItemId,
        quantity: row.goodEmergence + row.poorEmergence,
      }))
      .filter((row) => row.quantity > 0);

    const updateItems = rowsWithQuantity
      .filter((row) => row.inFlightId)
      .map((row) => ({
        shipment_item_id: row.shipment_item_id,
        quantity: row.quantity,
      }));

    const addItems = rowsWithQuantity
      .filter((row) => !row.inFlightId)
      .map((row) => ({
        shipment_item_id: row.shipment_item_id,
        quantity: row.quantity,
      }));

    const deleteIdsFromZeroQuantityRows = editingRows
      .filter((row) => row.inFlightId && row.goodEmergence + row.poorEmergence <= 0)
      .map((row) => row.inFlightId);

    const deleteInFlightIds = uniquePositiveIds([
      ...editingDeleteInFlightIds,
      ...deleteIdsFromZeroQuantityRows,
    ]);

    if (updateItems.length === 0 && addItems.length === 0 && deleteInFlightIds.length === 0) {
      setEditReleaseStatus("success");
      setEditReleaseMessage("No release changes to save");
      return;
    }

    setEditReleaseStatus("saving");
    setEditReleaseMessage(null);

    try {
      for (const inFlightId of deleteInFlightIds) {
        const response = await fetch(`/api/tenant/in-flight/${inFlightId}`, {
          method: "DELETE",
          headers: tenantHeaders,
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Failed to remove release row"));
        }
      }

      if (updateItems.length > 0) {
        const response = await fetch(releaseRouteUrl(editingReleaseId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...tenantHeaders },
          body: JSON.stringify({ items: updateItems }),
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Failed to update release"));
        }
      }

      for (const item of addItems) {
        const response = await fetch(`/api/tenant/releases/${editingReleaseId}/in-flight`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tenantHeaders },
          body: JSON.stringify(item),
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Failed to add release row"));
        }
      }

      await syncAfterMutation();
      setEditingDeleteInFlightIds([]);

      setEditReleaseStatus("success");
      setEditReleaseMessage("Release updated");
    } catch (error) {
      setEditReleaseStatus("error");
      setEditReleaseMessage(error instanceof Error ? error.message : "Failed to update release");
    }
  };

  const inFlightItems = useMemo(() => {
    if (!detail) return [];
    return detail.items.filter((item) => item.inFlightQuantity > 0);
  }, [detail]);

  const updateInFlightEdit = (inFlightId: number, delta: number, fallbackValue: number) => {
    setInFlightEdits((prev) => {
      const current = prev[inFlightId] ?? fallbackValue;
      return {
        ...prev,
        [inFlightId]: Math.max(1, current + delta),
      };
    });
  };

  const handleUpdateInFlight = async (shipmentItemId: number, fallbackValue: number) => {
    const releaseRow = releaseInFlightByShipmentItemId.get(shipmentItemId);
    if (!releaseRow) return;

    const quantity = Math.max(1, inFlightEdits[releaseRow.inFlightId] ?? fallbackValue);

    setInFlightStatus("saving");
    setInFlightMessage(null);

    try {
      const response = await fetch(`/api/tenant/in-flight/${releaseRow.inFlightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to update in-flight quantity"));
      }

      await syncAfterMutation();

      setInFlightStatus("success");
      setInFlightMessage("In-flight quantity updated");
    } catch (error) {
      setInFlightStatus("error");
      setInFlightMessage(
        error instanceof Error ? error.message : "Failed to update in-flight quantity",
      );
    }
  };

  const handleDeleteInFlight = async (shipmentItemId: number) => {
    const releaseRow = releaseInFlightByShipmentItemId.get(shipmentItemId);
    if (!releaseRow) return;

    setInFlightStatus("saving");
    setInFlightMessage(null);

    try {
      const response = await fetch(`/api/tenant/in-flight/${releaseRow.inFlightId}`, {
        method: "DELETE",
        headers: tenantHeaders,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to delete in-flight row"));
      }

      await syncAfterMutation();

      setInFlightStatus("success");
      setInFlightMessage("In-flight row deleted");
    } catch (error) {
      setInFlightStatus("error");
      setInFlightMessage(error instanceof Error ? error.message : "Failed to delete in-flight row");
    }
  };

  if (status === "loading" && !detail) {
    return (
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 px-4 py-10 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading shipment</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 px-4 py-10 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Shipment not available</CardTitle>
            <CardDescription>{errorMessage ?? "Unable to load shipment"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 px-4 py-10 md:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Shipment Summary</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs uppercase">Supplier</p>
              <p className="text-sm font-semibold">{detail.shipment.supplierCode}</p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs uppercase">Shipment Date</p>
              <p className="text-sm font-semibold">
                {formatDateTime(detail.shipment.shipmentDate)}
              </p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs uppercase">Arrival Date</p>
              <p className="text-sm font-semibold">{formatDateTime(detail.shipment.arrivalDate)}</p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs uppercase">Created</p>
              <p className="text-sm font-semibold">{formatDateTime(detail.shipment.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 border-b pb-2">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "items" ? "default" : "outline"}
            onClick={() => setActiveTab("items")}
          >
            Line Items
          </Button>

          <Button
            variant={activeTab === "releases" ? "default" : "outline"}
            onClick={() => setActiveTab("releases")}
          >
            Releases
          </Button>

          <Button
            variant={activeTab === "inflight" ? "default" : "outline"}
            onClick={() => setActiveTab("inflight")}
          >
            In-Flight
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm" htmlFor="name-display-mode">
            List Names By
          </label>
          <select
            id="name-display-mode"
            className="rounded-md border px-2 py-1 text-sm"
            value={nameDisplayMode}
            onChange={(event) => setNameDisplayMode(event.target.value as "scientific" | "common")}
          >
            <option value="scientific">Scientific Name</option>
            <option value="common">Common Name</option>
          </select>
        </div>
      </div>

      {activeTab === "items" && (
        <Card>
          <CardHeader>
            <CardTitle>Shipment Items</CardTitle>
            <CardDescription>
              Use +/- controls to update shipment metrics for testing.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddShipmentItem}
                disabled={availableSpeciesOptions.length === 0}
              >
                Add Shipment Item
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>
                    {nameDisplayMode === "scientific" ? "Scientific Name" : "Common Name"}
                  </TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Emerged</TableHead>
                  <TableHead>Damaged</TableHead>
                  <TableHead>Diseased</TableHead>
                  <TableHead>Parasite</TableHead>
                  <TableHead>Non-Emergence</TableHead>
                  <TableHead>Poor Emergence</TableHead>
                  <TableHead>In Flight</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {detail.items.map((item) => {
                  const imageUrl = getShipmentItemImageUrl(item);
                  const displayName = getDisplayName(item);

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={displayName}
                            width={40}
                            height={40}
                            className="rounded"
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>

                      <TableCell>
                        {item.id > 0 ? (
                          <span className="italic">{displayName}</span>
                        ) : (
                          <select
                            className="w-full rounded-md border px-2 py-1 text-sm"
                            value={item.butterflySpeciesId}
                            onChange={(event) =>
                              updateItemSpecies(item.id, Number(event.target.value))
                            }
                          >
                            {availableSpeciesOptions.map((species) => (
                              <option
                                key={`${item.id}-${species.butterflySpeciesId}`}
                                value={species.butterflySpeciesId}
                              >
                                {getDisplayName(species)}
                              </option>
                            ))}
                          </select>
                        )}
                      </TableCell>

                      <TableCell>
                        <QuantityStepper
                          value={item.numberReceived}
                          onDecrement={() => updateMetric(item.id, "numberReceived", -1)}
                          onIncrement={() => updateMetric(item.id, "numberReceived", 1)}
                          decrementLabel={`Decrease number received for ${displayName}`}
                          incrementLabel={`Increase number received for ${displayName}`}
                        />
                      </TableCell>

                      <TableCell>
                        <QuantityStepper
                          value={item.emergedInTransit}
                          onDecrement={() => updateMetric(item.id, "emergedInTransit", -1)}
                          onIncrement={() => updateMetric(item.id, "emergedInTransit", 1)}
                          decrementLabel={`Decrease emerged in transit for ${displayName}`}
                          incrementLabel={`Increase emerged in transit for ${displayName}`}
                        />
                      </TableCell>

                      <TableCell>
                        <QuantityStepper
                          value={item.damagedInTransit}
                          onDecrement={() => updateMetric(item.id, "damagedInTransit", -1)}
                          onIncrement={() => updateMetric(item.id, "damagedInTransit", 1)}
                          decrementLabel={`Decrease damaged in transit for ${displayName}`}
                          incrementLabel={`Increase damaged in transit for ${displayName}`}
                        />
                      </TableCell>

                      <TableCell>
                        <QuantityStepper
                          value={item.diseasedInTransit}
                          onDecrement={() => updateMetric(item.id, "diseasedInTransit", -1)}
                          onIncrement={() => updateMetric(item.id, "diseasedInTransit", 1)}
                          decrementLabel={`Decrease diseased in transit for ${displayName}`}
                          incrementLabel={`Increase diseased in transit for ${displayName}`}
                        />
                      </TableCell>

                      <TableCell>
                        <QuantityStepper
                          value={item.parasite}
                          onDecrement={() => updateMetric(item.id, "parasite", -1)}
                          onIncrement={() => updateMetric(item.id, "parasite", 1)}
                          decrementLabel={`Decrease parasite count for ${displayName}`}
                          incrementLabel={`Increase parasite count for ${displayName}`}
                        />
                      </TableCell>

                      <TableCell>
                        <QuantityStepper
                          value={item.nonEmergence}
                          onDecrement={() => updateMetric(item.id, "nonEmergence", -1)}
                          onIncrement={() => updateMetric(item.id, "nonEmergence", 1)}
                          decrementLabel={`Decrease non-emergence count for ${displayName}`}
                          incrementLabel={`Increase non-emergence count for ${displayName}`}
                        />
                      </TableCell>

                      <TableCell>
                        <QuantityStepper
                          value={item.poorEmergence}
                          onDecrement={() => updateMetric(item.id, "poorEmergence", -1)}
                          onIncrement={() => updateMetric(item.id, "poorEmergence", 1)}
                          decrementLabel={`Decrease poor emergence count for ${displayName}`}
                          incrementLabel={`Increase poor emergence count for ${displayName}`}
                        />
                      </TableCell>

                      <TableCell>{item.inFlightQuantity}</TableCell>

                      <TableCell className="font-semibold">{getRemaining(item)}</TableCell>

                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteShipmentItem(item.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveShipmentItems} disabled={saveItemsStatus === "saving"}>
                Save Metrics
              </Button>

              {saveItemsMessage && <p className="text-sm">{saveItemsMessage}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "releases" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Release</CardTitle>
              <CardDescription>Use good and poor emergence controls per species.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Good Emergence</TableHead>
                    <TableHead>Poor Emergence</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {releaseRows.map((row) => (
                    <TableRow key={row.item.id}>
                      <TableCell>
                        {getShipmentItemImageUrl(row.item) ? (
                          <Image
                            src={getShipmentItemImageUrl(row.item)!}
                            alt={getDisplayName(row.item)}
                            width={40}
                            height={40}
                            className="rounded"
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="italic">{getDisplayName(row.item)}</TableCell>
                      <TableCell>{row.available}</TableCell>

                      <TableCell>
                        <QuantityStepper
                          value={row.draft.goodEmergence}
                          onDecrement={() =>
                            updateReleaseDraft(row.item.id, "goodEmergence", -1, row.available)
                          }
                          onIncrement={() =>
                            updateReleaseDraft(row.item.id, "goodEmergence", 1, row.available)
                          }
                          decrementLabel={`Decrease good emergence for ${getDisplayName(row.item)}`}
                          incrementLabel={`Increase good emergence for ${getDisplayName(row.item)}`}
                        />
                      </TableCell>

                      <TableCell>
                        <QuantityStepper
                          value={row.draft.poorEmergence}
                          onDecrement={() =>
                            updateReleaseDraft(row.item.id, "poorEmergence", -1, row.available)
                          }
                          onIncrement={() =>
                            updateReleaseDraft(row.item.id, "poorEmergence", 1, row.available)
                          }
                          decrementLabel={`Decrease poor emergence for ${getDisplayName(row.item)}`}
                          incrementLabel={`Increase poor emergence for ${getDisplayName(row.item)}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCreateRelease}
                  disabled={!hasReleaseDraftValues || releaseStatus === "saving"}
                >
                  Create Release
                </Button>

                {releaseMessage && <p className="text-sm">{releaseMessage}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Release Events</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {releaseHistoryStatus === "loading" && (
                <p className="text-muted-foreground text-sm">Loading release events...</p>
              )}

              {releaseHistoryStatus === "error" && releaseHistoryMessage && (
                <p className="text-sm">{releaseHistoryMessage}</p>
              )}

              {releaseEventRows.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No release events available in this session.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Release ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Species Count</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {releaseEventRows.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{event.id}</TableCell>
                        <TableCell>{formatDateTime(event.releaseDate)}</TableCell>
                        <TableCell>{event.items.length}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => startReleaseEditing(event.id)}
                          >
                            Edit
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteRelease(event.id)}
                            disabled={releaseStatus === "saving"}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {editingReleaseId && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Release {editingReleaseId}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Photo</TableHead>
                      <TableHead>Species</TableHead>
                      <TableHead>Good Emergence</TableHead>
                      <TableHead>Poor Emergence</TableHead>
                      <TableHead>Remove Row</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {editingRows.map((row, rowIndex) => {
                      const rowItem = shipmentItemById.get(row.shipmentItemId);
                      const rowImage = rowItem ? getShipmentItemImageUrl(rowItem) : null;

                      return (
                        <TableRow key={`${row.shipmentItemId}-${rowIndex}`}>
                          <TableCell>
                            {rowImage ? (
                              <Image
                                src={rowImage}
                                alt={
                                  rowItem
                                    ? getDisplayName(rowItem)
                                    : `Species ${row.shipmentItemId}`
                                }
                                width={40}
                                height={40}
                                className="rounded"
                              />
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          <TableCell>
                            {row.inFlightId ? (
                              <span className="italic">
                                {rowItem
                                  ? getDisplayName(rowItem)
                                  : `Species ${row.shipmentItemId}`}
                              </span>
                            ) : (
                              <select
                                className="w-full rounded-md border px-2 py-1 text-sm"
                                value={row.shipmentItemId}
                                onChange={(event) =>
                                  updateEditingRowSpecies(rowIndex, Number(event.target.value))
                                }
                              >
                                {detail.items
                                  .filter((item) => item.id > 0)
                                  .map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {getDisplayName(item)}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </TableCell>

                          <TableCell>
                            <QuantityStepper
                              value={row.goodEmergence}
                              onDecrement={() =>
                                updateEditingRowMetric(rowIndex, "goodEmergence", -1)
                              }
                              onIncrement={() =>
                                updateEditingRowMetric(rowIndex, "goodEmergence", 1)
                              }
                              decrementLabel={`Decrease good emergence in row ${rowIndex + 1}`}
                              incrementLabel={`Increase good emergence in row ${rowIndex + 1}`}
                            />
                          </TableCell>

                          <TableCell>
                            <QuantityStepper
                              value={row.poorEmergence}
                              onDecrement={() =>
                                updateEditingRowMetric(rowIndex, "poorEmergence", -1)
                              }
                              onIncrement={() =>
                                updateEditingRowMetric(rowIndex, "poorEmergence", 1)
                              }
                              decrementLabel={`Decrease poor emergence in row ${rowIndex + 1}`}
                              incrementLabel={`Increase poor emergence in row ${rowIndex + 1}`}
                            />
                          </TableCell>

                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => removeEditingRow(rowIndex, row.inFlightId)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={addEditingRow}>
                    Add Species Row
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSaveReleaseEdit}
                    disabled={editReleaseStatus === "saving"}
                  >
                    Save Release
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingReleaseId(null);
                      setEditingRows([]);
                      setEditingDeleteInFlightIds([]);
                      setEditReleaseStatus("idle");
                      setEditReleaseMessage(null);
                    }}
                  >
                    Cancel
                  </Button>

                  {editReleaseMessage && <p className="text-sm">{editReleaseMessage}</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "inflight" && (
        <Card>
          <CardHeader>
            <CardTitle>In-Flight Butterflies</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {inFlightItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">No butterflies currently in flight.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Quantity</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {inFlightItems.map((item) => {
                    const releaseRow = releaseInFlightByShipmentItemId.get(item.id);
                    const displayName = getDisplayName(item);

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          {getShipmentItemImageUrl(item) ? (
                            <Image
                              src={getShipmentItemImageUrl(item)!}
                              alt={displayName}
                              width={40}
                              height={40}
                              className="rounded"
                            />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="italic">{displayName}</TableCell>

                        <TableCell className="space-y-2">
                          {releaseRow ? (
                            <>
                              <QuantityStepper
                                value={
                                  inFlightEdits[releaseRow.inFlightId] ?? item.inFlightQuantity
                                }
                                onDecrement={() =>
                                  updateInFlightEdit(
                                    releaseRow.inFlightId,
                                    -1,
                                    item.inFlightQuantity,
                                  )
                                }
                                onIncrement={() =>
                                  updateInFlightEdit(
                                    releaseRow.inFlightId,
                                    1,
                                    item.inFlightQuantity,
                                  )
                                }
                                decrementLabel={`Decrease in-flight quantity for ${displayName}`}
                                incrementLabel={`Increase in-flight quantity for ${displayName}`}
                              />

                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    handleUpdateInFlight(item.id, item.inFlightQuantity)
                                  }
                                  disabled={inFlightStatus === "saving"}
                                >
                                  Save
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteInFlight(item.id)}
                                  disabled={inFlightStatus === "saving"}
                                >
                                  Delete
                                </Button>
                              </div>
                            </>
                          ) : (
                            <span>{item.inFlightQuantity}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {inFlightMessage && <p className="text-sm">{inFlightMessage}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
