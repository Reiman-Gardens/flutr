import { z } from "zod";
import { sanitizeText } from "@/lib/validation/sanitize";

const nameSchema = z
  .string({ message: "Name is required" })
  .min(1, "Name is required")
  .max(200, "Name is too long")
  .transform((value) => sanitizeText(value))
  .refine((value) => value.length > 0, "Name is required");

const emailSchema = z
  .string({ message: "Email is required" })
  .transform((value) => sanitizeText(value))
  .refine((value) => value.length > 0, "Email is required")
  .refine((value) => z.string().email().safeParse(value).success, "Email is invalid");

const passwordSchema = z
  .string({ message: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long");

const roleSchema = z.enum(["SUPERUSER", "ORG_SUPERUSER", "ADMIN", "EMPLOYEE"], {
  message: "Role is required",
});

export const createUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: roleSchema,
    institutionId: z.number().int().positive().optional(),
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    role: roleSchema.optional(),
    institutionId: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.name && !data.email && !data.password && !data.role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one change is required",
        path: [],
      });
    }
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const deleteUserSchema = z.object({
  institutionId: z.number().int().positive().optional(),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

export const listUsersQuerySchema = z
  .object({
    institutionId: z
      .preprocess((value) => {
        if (value == null) return undefined;
        if (typeof value !== "string") return Number.NaN;

        const trimmed = value.trim();
        if (!/^\d+$/.test(trimmed)) return Number.NaN;

        return Number.parseInt(trimmed, 10);
      }, z.number().int().positive("Institution id must be a positive integer"))
      .optional(),
  })
  .strict();

export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;
