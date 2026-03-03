import { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { butterfly_species } from "@/lib/schema";
import { internalError, ok } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    void request;
    const rows = await db.select().from(butterfly_species);

    return ok({ species: rows });
  } catch {
    return internalError();
  }
}
