import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { canCreateRelease, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { release_events, shipments } from "@/lib/schema";
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

    const [created] = await db
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

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error("Failed to create release", error);
    return NextResponse.json({ error: "Unable to create release" }, { status: 500 });
  }
}
