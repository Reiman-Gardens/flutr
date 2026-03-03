import { z, type ZodIssue } from "zod";
import type { NextRequest } from "next/server";

export const textSanitizer = z.string().transform((value) => sanitizeText(value));

export function sanitizeText(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input.replace(/<[^>]*>/g, "").trim();
}

export function formatZodIssues(issues: ZodIssue[]): Array<{
  path: string;
  message: string;
}> {
  return issues.map((issue) => ({
    path: issue.path.join(".") || "",
    message: issue.message,
  }));
}

export async function parseJsonBody<T>(request: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }

  return schema.parseAsync(json);
}

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const institutionIdParamSchema = z.object({
  institutionId: z.coerce.number().int().positive(),
});
