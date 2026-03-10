import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "./shared";
import { invalidRequest } from "@/lib/api-response";

export async function requireValidBody<S extends z.ZodTypeAny>(request: NextRequest, schema: S) {
  const result = await parseJsonBody<z.infer<S>>(request, schema);

  if (!result.success && result.type === "invalid_json") {
    return { error: invalidRequest("Malformed JSON body") };
  }

  if (!result.success && result.type === "validation_error") {
    return {
      error: invalidRequest("Invalid request body", result.issues),
    };
  }

  return { data: result.data };
}
