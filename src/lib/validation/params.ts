import { z } from "zod";

/**
 * Generic numeric ID param
 * Used for routes like /api/.../[id]
 */
export const idParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

/**
 * Tenant institution ID param
 */
export const institutionIdParamSchema = z
  .object({
    institutionId: z.coerce.number().int().positive(),
  })
  .strict();
