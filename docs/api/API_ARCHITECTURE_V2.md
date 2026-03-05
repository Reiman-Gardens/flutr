## Flutr V2 Backend API Architecture

Authoritative spec for rebuilding the backend API layer from scratch. New projects/agents should treat this as the contract for all API work.

---

## 1. Route Groups & URL Structure

All routes live under `src/app/api`. There are three primary route groups plus auth and compatibility routes:

- **Public (no auth)**: `/api/public/*`
  - `GET /api/public/institutions`
  - `GET /api/public/institutions/[slug]`
  - `GET /api/public/institutions/[slug]/gallery`
  - `GET /api/public/institutions/[slug]/in-flight`
  - `GET /api/public/institutions/[slug]/species`
  - `GET /api/public/institutions/[slug]/species/[scientific_name]`
  - `GET /api/public/species`

- **Tenant-scoped (authenticated, single institution)**: `/api/tenant/*`
  - Institution-scoped operations for the current tenant:
    - `/api/tenant/shipments` (scaffolded; not fully implemented yet)
    - `/api/tenant/shipments/[id]` (scaffolded; not fully implemented yet)
    - `/api/tenant/shipments/[id]/releases` (scaffolded; not fully implemented yet)
    - `/api/tenant/releases/[releaseId]/in-flight` (scaffolded; not fully implemented yet)
    - `/api/tenant/in-flight/[id]` (scaffolded; not fully implemented yet)
    - `/api/tenant/suppliers` (scaffolded; not fully implemented yet)
    - `/api/tenant/users` (scaffolded; not fully implemented yet)
    - `/api/tenant/users/[id]` (scaffolded; not fully implemented yet)
    - `/api/tenant/institution` (scaffolded; not fully implemented yet)

- **Platform (SUPERUSER / cross-tenant)**: `/api/platform/*`
  - Global catalog & multi-tenant management:
    - `/api/platform/institutions` (scaffolded; not fully implemented yet)
    - `/api/platform/institutions/[id]` (scaffolded; not fully implemented yet)
    - `/api/platform/species` (scaffolded; not fully implemented yet)
    - `/api/platform/species/[id]` (scaffolded; not fully implemented yet)
    - `/api/platform/suppliers` (scaffolded; not fully implemented yet)

- **Auth**:
  - `/api/auth/[...nextauth]` (NextAuth handlers)

Public routes never require authentication. All `/api/tenant/*` and `/api/platform/*` routes must enforce auth and tenant/role rules as described below.

---

## 2. Data & Tenant Model (Summary)

High-level expectations; actual schema is defined in `src/lib/schema.ts`.

- **Tenants**:
  - Tenant root entity: `institutions` (id, slug, address, theming, stats flags, etc.).
  - All operational tables are tenant-scoped via `institution_id`.

- **Users**:
  - `users` table includes `institution_id` and `role`.
  - Roles currently supported:
    - `EMPLOYEE`
    - `ADMIN`
    - `SUPERUSER`
  - `ORG_SUPERUSER` is intentionally **not** implemented yet; architecture must allow adding it later by editing a single file (`authz.ts`).

- **Global reference data**:
  - `butterfly_species` is global (no `institution_id`).
  - `butterfly_species_institution` joins species to institutions and stores overrides.

- **Shipments & quality**:
  - `suppliers` is tenant-scoped, with unique `(institution_id, code)` and composite FKs to shipments.
  - `shipments` and `shipment_items` are tenant-scoped; composite FKs enforce same-tenant relationships.
  - `release_events` and `in_flight` are tenant-scoped; composite FKs enforce consistent `institution_id`.

- **Suppliers (V2 global registry requirement)**:
  - There will be a **global supplier registry** that institutions link to.
  - Implementation detail (tables) can evolve, but tenant routes must always:
    - Resolve supplier relationships through tenant-scoped join/lookup constrained by `institution_id`.
  - Platform routes manage the global registry.

---

## 3. Authentication & Session

- **Stack**:
  - Next.js App Router.
  - NextAuth 5 with credentials provider (email/password).
  - JWT sessions.

- **Session content** (minimum):
  - `session.user.id` — numeric user id (stringified).
  - `session.user.role` — one of `EMPLOYEE`, `ADMIN`, `SUPERUSER`.
  - `session.user.institutionId` — numeric tenant id.

- **Auth helper**:
  - Exported from `@/auth`:
    - `auth()` — retrieves server-side session.
    - `handlers` — NextAuth route handlers.
    - `signIn`, `signOut`.

- **Guard** (single source of truth):
  - `requireUser(session: Session | null)` in `src/lib/authz.ts`:
    - Throws on unauthenticated sessions with a sentinel error (e.g. `"UNAUTHORIZED"`).
    - Routes must catch and map to `401`.

No API route is allowed to access `session.user` directly without going through `requireUser` for protected operations.

---

## 4. Authorization (authz) Rules

All API routes must use **centralized helpers** from `src/lib/authz.ts`. No raw role checks (`user.role === "ADMIN"`) are allowed in `src/app/api/**`.

### 4.1 Role system

- Role ranking (for internal use in `authz.ts` only):
  - `EMPLOYEE`: 0
  - `ADMIN`: 1
  - `SUPERUSER`: 2

- `ORG_SUPERUSER` must be easy to add later by:
  - Extending the roleRank enum.
  - Updating `canX` helpers as needed.

### 4.2 Domain helpers (API-facing)

These are examples; implementations live in `authz.ts`. Routes must only call these, never inspect roles directly:

- **Shipments & releases**:
  - `canReadShipment(user)` — `EMPLOYEE+`.
  - `canWriteShipment(user)` — `EMPLOYEE+`.
  - `canCreateRelease(user)` — `EMPLOYEE+`.

- **Suppliers**:
  - `canReadSuppliers(user)` — `EMPLOYEE+`.
  - `canManageSuppliers(user)` — `ADMIN+`.

- **Institution profile**:
  - `canManageInstitutionProfile(user)` — `ADMIN+` (tenant-limited).

- **Platform / global**:
  - `canCreateInstitution(user)` — `SUPERUSER`.
  - `canManageGlobalButterflies(user)` — `SUPERUSER`.
  - `canCrossTenant(user)` — `SUPERUSER` only.

- **User management**:
  - `canManageUsers(user)` — `ADMIN+`.
  - `canModifyUser(actor, target)` — actor/target awareness via ranks.
  - `canAssignRole(actor, newRole, target?)`.
  - `canDeleteUser(actor, target)`.

New API endpoints must define and use appropriate `canX` helpers rather than embedding ad-hoc role logic.

---

## 5. Tenant Enforcement (`tenant.ts`)

All tenant and cross-tenant logic must be centralized in `src/lib/tenant.ts`.

### 5.1 `tenantCondition(user, column, targetInstitutionId?)`

- Returns a Drizzle `eq(column, someInstitutionId)` condition **or** `undefined`.

- Behavior:
  - **SUPERUSER**:
    - If `targetInstitutionId` is a valid positive integer:
      - Returns `eq(column, targetInstitutionId)` — explicit cross-tenant filter.
    - If not provided:
      - Returns `undefined` — no tenant restriction (for platform reads only).
  - **Non-SUPERUSER**:
    - Requires a valid `user.institutionId`. If missing/invalid → throw `"Tenant required for non-platform user"`.
    - If `targetInstitutionId` is provided and differs from `user.institutionId` → throw `"Forbidden cross-tenant access"`.
    - Otherwise returns `eq(column, user.institutionId)`.

- Usage:
  - For all **read** operations in `/api/tenant/*` and any cross-tenant aware `/api/platform/*` routes that touch tenant-scoped tables.

### 5.2 `resolveTenantId(user, requestedInstitutionId?)`

- Returns the **actual tenant id** to write to `institution_id` on inserts/updates.

- Behavior:
  - **SUPERUSER**:
    - Must explicitly provide a valid `requestedInstitutionId`.
    - If invalid/missing → throw `"Tenant required for write operation"`.
    - Returns `requestedInstitutionId`.
  - **Non-SUPERUSER**:
    - Requires a valid `user.institutionId`. If missing/invalid → throw `"Tenant required for write operation"`.
    - If `requestedInstitutionId` is provided and differs from `user.institutionId` → throw `"Forbidden cross-tenant write"`.
    - Returns `user.institutionId`.

- Usage:
  - For all **write** operations (insert/update/delete) on tenant-scoped tables in `/api/tenant/*` and relevant `/api/platform/*` routes.
  - Routes must **never** trust a raw `institutionId` from the client when setting `institution_id`; always pass it through `resolveTenantId`.

### 5.3 `ensureTenantExists(institutionId)`

- Checks that `institutionId` is a valid positive integer.
- Verifies existence in `institutions` table.
- Throws `"Institution not found"` if missing.

- Usage:
  - Before writes that rely on an explicit tenant id (especially platform writes).

---

## 6. Standard Request Flow Per Route Type

### 6.1 Public routes (`/api/public/*`)

- **No auth**: never call `auth()` or `requireUser`.
- **Validation**:
  - Validate route params and query using strict Zod schemas (`.strict()`).
  - Sanitize all free-text inputs via `sanitizeText` in the validation layer.
- **Tenant visibility**:
  - Derive `institution_id` from the institution `slug` via `institutions` table.
  - Filter all tenant-scoped tables by resolved `institution_id`.
- **Statuses**:
  - `400` — invalid params/query.
  - `404` — institution or resource not found.
  - `500` — internal server error.

### 6.2 Tenant routes (`/api/tenant/*`)

Handler skeleton for **protected** routes:

1. **Authenticate**:
   - `const session = await auth();`
   - `let user; try { user = requireUser(session); } catch { return 401; }`

2. **Authorize**:
   - Call appropriate `canX(user)` helper; `403` on failure.

3. **Validate Input**:
   - Parse JSON body with Zod schema (strict, sanitized).
   - Parse route params and query with separate Zod schemas.

4. **Tenant Resolution**:
   - For reads:
     - Use `tenantCondition(user, someTable.institution_id, maybeInstitutionIdFromQuery)`.
   - For writes:
     - Use `resolveTenantId(user, maybeInstitutionIdFromBody)` to derive actual `institution_id`.
     - Call `ensureTenantExists(tenantId)` if the tenantId originated from request data or platform context.

5. **DB Operation**:
   - Always include tenant condition (`tenantCondition`) in `WHERE` for tenant-scoped tables.
   - For single-row fetches, if no row is found after applying tenant filter → return `404`.

6. **Errors & Status Codes**:
   - `401` — unauthenticated (`requireUser` throws).
   - `403` — permission violation or explicit cross-tenant override attempt (`resolveTenantId` / `tenantCondition`).
   - `404` — resource not found or not visible in this tenant.
   - `400` — invalid input.
   - `409` — unique constraint/semantic conflict (e.g. duplicate slug, duplicate scientific_name).
   - `500` — internal error.

### 6.3 Platform routes (`/api/platform/*`)

Same as tenant routes, but:

- **Authz**:
  - Use platform helpers (`canManageGlobalButterflies`, `canCreateInstitution`, `canCrossTenant`) to restrict access to `SUPERUSER`.

- **Tenant behavior**:
  - For global tables (e.g. `butterfly_species`), no tenant filter is needed.
  - For cross-tenant reads/writes on tenant-scoped tables:
    - Reads: `tenantCondition(user, someTable.institution_id, institutionIdFromQuery)` may return no filter for SUPERUSER if `institutionId` omitted.
    - Writes: `resolveTenantId` must always be used, and SUPERUSER must explicitly pass `institutionId`.

---

## 7. Validation Layer

All validation lives under `src/lib/validation`. Patterns:

- **Per-domain modules**:
  - `validation/users.ts`
  - `validation/shipments.ts`
  - `validation/species.ts`
  - `validation/institution.ts`
  - `validation/releases.ts`
  - `validation/public.ts` (for public routes: slugs, public query filters, etc.)
  - `validation/suppliers.ts`
  - `validation/params.ts`
  - `validation/request.ts`
  - `validation/query.ts`
  - `validation/sanitize.ts`
  - `validation/shared.ts`

- **Rules**:
  - All Zod object schemas must call `.strict()`.
  - All user-entered text must be sanitized via `sanitizeText` (strip HTML + trim) as a `.transform` in schemas.
  - Route param & query schemas should:
    - Use `z.coerce.number()` (or equivalent preprocessors) for numeric ids from strings.
    - Enforce simple slug patterns for `[slug]` and `[scientific_name]` where appropriate.

- **Helpers**:
  - `requireValidBody(request, schema)` for standardized JSON body parsing + validation mapping.
  - `requireValidQuery(schema, data)` for standardized query validation mapping.
  - `parseJsonBody(request, schema)` remains a lower-level helper used by request validation utilities.

---

## 8. Error Response Contract

All API routes (public, tenant, platform) must use a consistent JSON envelope:

```jsonc
// Example
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request",
    "details": [{ "path": "slug", "message": "Slug is required" }],
  },
}
```

- **Fields**:
  - `error.code` — stable machine-readable string:
    - `UNAUTHORIZED`
    - `FORBIDDEN`
    - `INVALID_REQUEST`
    - `NOT_FOUND`
    - `CONFLICT`
    - `INTERNAL_ERROR`
  - `error.message` — human-readable summary.
  - `error.details` — optional array for validation issues; each item has:
    - `path` — string (e.g. `"items[0].butterflySpeciesId"` or `"slug"`).
    - `message` — human-readable explanation.

- **Status codes**:
  - `401` — unauthenticated.
  - `403` — permission violation or explicit cross-tenant override attempt.
  - `404` — resource not found _or not visible in this tenant_ (do not leak cross-tenant existence).
  - `400` — invalid input (parse/validation).
  - `409` — conflict (e.g. uniqueness).
  - `500` — unexpected internal error.

Public routes will use only `400`, `404`, and `500`, but with the same envelope.

---

## 9. Testing Expectations

All `completed` routes must have Jest tests. For now, tests can be **unit-style** that mock `auth()` and `db`.

- **Public routes**:
  - Success path (200).
  - Validation failure (400 + `INVALID_REQUEST`).
  - Not found (404 + `NOT_FOUND`).
  - Internal error (500 + `INTERNAL_ERROR`).

- **Tenant & platform routes**:
  - `401` when unauthenticated.
  - `403` when `canX(user)` fails.
  - `403` on explicit cross-tenant attempts (conflicting tenant ids).
  - `404` when resource not found in tenant scope.
  - Success path (2xx) with correct response shape.

As the system evolves, integration-style tests with a real test database can be added, but unit tests with mocks are the minimum requirement.

---

## 10. Drift Prevention

- **No raw role checks in routes**:
  - Disallow `user.role === "ADMIN"` in `src/app/api/**`.
  - All role/permission logic must flow through `authz.ts` helpers.

- **Tenant safety**:
  - Any access to tenant-scoped tables (`institution_id` columns) must:
    - Use `tenantCondition` for reads.
    - Use `resolveTenantId` & set `institution_id` explicitly for writes.

- **Validation & sanitization at the edge**:
  - All route inputs (body, params, query) must be validated via Zod.
  - All text fields must be sanitized in the validation layer only.

- **Documentation**:
  - This file (`API_ARCHITECTURE_V2.md`) is the canonical spec.
  - New endpoints must be consistent with these rules; if they introduce new patterns, this spec should be updated.
