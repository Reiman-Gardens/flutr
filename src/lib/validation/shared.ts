import { z } from "zod";
import type { NextRequest } from "next/server";

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; type: "invalid_json" }
  | { success: false; type: "validation_error"; issues: z.ZodError["issues"] };

export async function parseJsonBody<T>(
  request: NextRequest,
  schema: z.ZodTypeAny,
): Promise<ParseResult<T>> {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return { success: false, type: "invalid_json" };
  }

  const parsed = await schema.safeParseAsync(json);

  if (!parsed.success) {
    return { success: false, type: "validation_error", issues: parsed.error.issues };
  }

  return { success: true, data: parsed.data as T };
}
