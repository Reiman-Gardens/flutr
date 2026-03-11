import { z } from "zod";

/** Default and max page sizes for paginated endpoints. */
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/** Query schema for paginated public endpoints. */
export const paginatedQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .strict();
