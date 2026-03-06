import { z } from "zod";

import { sanitizeText, sanitizedNonEmpty } from "@/lib/validation/sanitize";
import type { UserRole } from "@/lib/authz";

export const USER_ROLES = [
  "EMPLOYEE",
  "ADMIN",
  "SUPERUSER",
] as const satisfies ReadonlyArray<UserRole>;

export const userIdParamsSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

export const listUsersQuerySchema = z
  .object({
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();

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
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const updateUserBodySchema = z
  .object({
    name: sanitizedNonEmpty(200).optional(),
    email: z
      .string()
      .trim()
      .email()
      .transform((v) => sanitizeText(v))
      .optional(),
    role: z.enum(USER_ROLES).optional(),
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();
