import { z } from "zod";

import { sanitizeText } from "@/lib/validation/sanitize";
import type { UserRole } from "@/lib/authz";

export const USER_ROLES = ["EMPLOYEE", "ADMIN", "SUPERUSER"] as const satisfies ReadonlyArray<UserRole>;

export const userIdParamsSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

export const listUsersQuerySchema = z
  .object({
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const createUserBodySchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v)),
    email: z
      .string()
      .email()
      .transform((v) => sanitizeText(v)),
    password: z.string().min(8).max(200),
    role: z.enum(USER_ROLES).optional(),
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const updateUserBodySchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(200)
      .transform((v) => sanitizeText(v))
      .optional(),
    email: z
      .string()
      .email()
      .transform((v) => sanitizeText(v))
      .optional(),
    role: z.enum(USER_ROLES).optional(),
    institutionId: z.coerce.number().int().positive().optional(),
  })
  .strict();
