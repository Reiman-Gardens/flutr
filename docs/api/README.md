# Flutr V2 API

This document is the quick index for the API layer. The authoritative contract is `API_ARCHITECTURE_V2.md`.

### Goals

- Strict multi-tenant safety (no cross-tenant leaks)
- Centralized authz + tenant enforcement helpers
- Zod `.strict()` validation + sanitization in validation layer only
- Consistent error envelope + status code semantics
- Jest tests written alongside routes

### Route groups

- **Public**: `src/app/api/public/*` (no auth)
- **Tenant**: `src/app/api/tenant/*` (auth required, tenant-scoped)
- **Platform**: `src/app/api/platform/*` (SUPERUSER only)
- **Auth**: `src/app/api/auth/[...nextauth]`
- **Compatibility**: `src/app/api/users` and `src/app/api/institution` (legacy placeholder routes)

### Error envelope (all routes)

All errors use:

```jsonc
{
  "error": {
    "code": "INVALID_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
    "message": "Human readable message",
    "details": [{ "path": "field.path", "message": "Validation message" }],
  },
}
```

- `details` is only present for validation errors.

### Status code rules (protected routes)

- `401` unauthenticated
- `403` permission violation OR explicit cross-tenant override attempt
- `404` resource does not exist OR is not visible in tenant scope
- `400` invalid input
- `409` conflict (unique constraint / semantic conflict)
- `500` internal error

### Authorization & tenant rules

- API routes must never do raw role checks (no `user.role === ...`).
- All authz must go through `src/lib/authz.ts` `canX(...)` helpers.
- All tenant enforcement must go through `src/lib/tenant.ts`:
  - reads: `tenantCondition(...)`
  - writes: `resolveTenantId(...)` (SUPERUSER must explicitly provide `institutionId` for writes)

### Validation rules

- All input must be validated using Zod schemas with `.strict()`.
- All user-provided text must be sanitized using `sanitizeText` in the validation layer only.
- Params/query schemas live in `src/lib/validation/*` alongside body schemas.

### Tests

- Tests live in `src/__test__/api/**` and mirror the route tree.
- Each route test must include:
  - happy path (2xx)
  - invalid input (400)
  - not found (404)
  - internal error (500)
- Protected routes also require:
  - unauthenticated (401)
  - forbidden (403)
  - wrong-tenant access returns 404 (not 403)

### Endpoint index

#### Public routes

- `GET /api/public/institutions` — list institutions
- `GET /api/public/institutions/[slug]` — institution details
- `GET /api/public/institutions/[slug]/gallery` — public gallery
- `GET /api/public/institutions/[slug]/in-flight` — in-flight for institution
- `GET /api/public/institutions/[slug]/species` — species visible for institution
- `GET /api/public/institutions/[slug]/species/[scientific_name]` — species detail within institution
- `GET /api/public/species` — global species list

#### Tenant routes

- `GET/POST /api/tenant/shipments`
- `GET/PATCH/DELETE /api/tenant/shipments/[id]`
- `POST /api/tenant/shipments/[id]/releases`
- `POST /api/tenant/releases/[releaseId]/in-flight`
- `PATCH/DELETE /api/tenant/in-flight/[id]`
- `GET/POST /api/tenant/suppliers`
- `GET/PATCH /api/tenant/institution`
- `GET/POST /api/tenant/users`
- `GET/PATCH/DELETE /api/tenant/users/[id]`

#### Platform routes

- `GET/POST /api/platform/institutions`
- `GET/PATCH/DELETE /api/platform/institutions/[id]`
- `GET/POST /api/platform/species`
- `GET/PATCH/DELETE /api/platform/species/[id]`
- `GET/POST /api/platform/suppliers` — global supplier registry

#### Compatibility routes

- `GET /api/users`
- `GET /api/institution`

## Test file layout recommendation

Mirror the route structure so it’s always obvious what’s covered:

- `src/__test__/api/public/institutions.route.test.ts`
- `src/__test__/api/public/institutions.slug.route.test.ts`
- `src/__test__/api/public/institutions.slug.gallery.route.test.ts`
- `src/__test__/api/public/institutions.slug.in-flight.route.test.ts`
- `src/__test__/api/public/institutions.slug.species.route.test.ts`
- `src/__test__/api/public/institutions.slug.species.scientific-name.route.test.ts`
- `src/__test__/api/public/species.route.test.ts`

…and similarly for `tenant/` and `platform/`.
