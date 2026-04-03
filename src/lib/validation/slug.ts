import { z } from "zod";

import { sanitizeText } from "@/lib/validation/sanitize";

export const institutionSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const institutionSlugSchema = z
  .string()
  .max(100)
  .transform(sanitizeText)
  .pipe(
    z
      .string()
      .min(1, "Slug is required")
      .regex(
        institutionSlugRegex,
        "Slug may contain lowercase letters (a-z), numbers (0-9), separated by single hyphens (-).",
      ),
  );
