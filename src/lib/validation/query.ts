import { z } from "zod";
import { invalidRequest } from "@/lib/api-response";

export function requireValidQuery<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): { data: z.infer<T> } | { error: Response } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      error: invalidRequest("Invalid request query", result.error.issues),
    };
  }

  return { data: result.data };
}
