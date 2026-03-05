import { z } from "zod";
import { invalidRequest } from "@/lib/api-response";

export function requireValidQuery(schema: z.ZodTypeAny, data: unknown) {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      error: invalidRequest("Invalid request query", result.error.issues),
    };
  }

  return { data: result.data };
}
