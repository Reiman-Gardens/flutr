import { z } from "zod";

import { sanitizeText, sanitizedNonEmpty } from "@/lib/validation/sanitize";
import type { UserRole } from "@/lib/authz";

export const USER_ROLES = [
  "EMPLOYEE",
  "ADMIN",
  "SUPERUSER",
] as const satisfies ReadonlyArray<UserRole>;

/**
 * Params: User ID
 */
export const userIdParamsSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

/**
 * Create user
 *
 * Tenant context is supplied via the x-tenant-slug header — not the request body.
 */
export const createUserBodySchema = z
  .object({
    name: sanitizedNonEmpty(200),
    email: z
      .string()
      .trim()
      .email()
      .transform((v) => sanitizeText(v)),
    password: z.string().min(8).max(200),
    role: z.enum(USER_ROLES).optional(),
  })
  .strict();

export type CreateUserBody = z.infer<typeof createUserBodySchema>;

/**
 * Update user
 *
 * Tenant context is supplied via the x-tenant-slug header — not the request body.
 */
export const updateUserBodySchema = z
  .object({
    name: sanitizedNonEmpty(200).optional(),
    email: z
      .string()
      .trim()
      .email()
      .transform((v) => sanitizeText(v))
      .optional(),
    password: z.string().min(8).max(200).optional(),
    role: z.enum(USER_ROLES).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.name === undefined &&
      data.email === undefined &&
      data.password === undefined &&
      data.role === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
      });
    }
  });

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
