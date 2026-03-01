# API Reference

This document is the canonical contract for currently implemented API endpoints under `src/app/api`.

## Conventions

- **Base path:** All routes are rooted at `/api`.
- **Content type:** Request and response bodies use JSON unless noted.
- **Date/time format:** Datetimes are ISO 8601 strings.
- **Auth source:** Protected routes use NextAuth session auth (JWT-backed).
- **Auth failure:** Protected routes return `401` with `{ "error": "Unauthorized" }` when no valid session user exists.
- **Validation failure:** Invalid input returns `400` with either:
  - `{ "error": "Invalid request", "details": [{ "path": string, "message": string }] }`, or
  - a route-specific `400` error shape documented below.
- **Tenant behavior:**
  - `SUPERUSER` can operate cross-tenant where supported.
  - Non-superuser roles are tenant-scoped.
  - Some routes require `institutionId` for superuser writes and return `403 { "error": "Tenant required" }` if missing.
  - Resource invisibility is represented as `404` for scoped reads/writes.
- **Common error payload:** `{ "error": string }` unless otherwise stated.
- **Session introspection:** `GET /api/users/me` is the canonical authenticated identity endpoint.
- **Auth framework handlers:** `GET|POST /api/auth/[...nextauth]` are delegated to NextAuth and are framework-managed.

## Contract Test Checklist (Refactor Safety)

Use this checklist when refactoring route internals (shared Zod helpers, sanitization helpers, error wrappers, etc.).

### Per-Route Contract Checks

- [ ] **Path + method unchanged** (unless intentionally versioned/documented).
- [ ] **Auth semantics unchanged** (`401` for unauthenticated on protected routes).
- [ ] **Authorization semantics unchanged** (`403` for role/permission denial).
- [ ] **Tenant isolation unchanged** (cross-tenant behavior and `403` vs `404` policy preserved).
- [ ] **Validation shape unchanged** (`400` with documented payload, strict unknown-key behavior preserved).
- [ ] **Sanitization behavior verified** (HTML stripping/trim rules still applied where expected).
- [ ] **Success status unchanged** (e.g., `200`, `201`, `204` as documented).
- [ ] **Success response keys/types unchanged** (no silent rename/removal/addition without docs update).
- [ ] **Error envelope unchanged** (`error`, and `details` where documented).
- [ ] **Conflict/not-found behavior unchanged** (`409` and `404` conditions still match docs).

### Minimal Test Matrix (MVP)

For each endpoint, keep at least these tests:

1. **Happy path** returns documented success status + response shape.
2. **Unauthenticated** request returns `401` (protected routes only).
3. **Forbidden/cross-tenant** request returns documented denial status (`403`/`404`).
4. **Invalid input** returns documented `400` payload (including `details` where applicable).
5. **Not found** resource returns documented `404` payload.

For write routes, add these two:

6. **Conflict path** returns `409` when uniqueness/semantic conflict applies.
7. **Tenant-required path** returns `403` (`{"error":"Tenant required"}`) where applicable.

### Refactor Guardrails

- Keep route handlers as the contract boundary; move only internal parsing/sanitization logic into helpers.
- If response or status must change, update this document and corresponding tests in the same PR.
- Prefer adding helper wrappers incrementally by route group to reduce blast radius.

## Public API

No authentication required.

### GET /api/public/institutions

- **Purpose:** List institutions for public directory.
- **Response 200:**
  - `Array<{`
    - `id: number`
    - `slug: string`
    - `name: string`
    - `street_address: string | null`
    - `city: string | null`
    - `state_province: string | null`
    - `postal_code: string | null`
    - `facility_image_url: string | null`
    - `logo_url: string | null`
    - `country: string | null`
  - `}>`
- **Errors:**
  - `500 { "error": "Unable to load institutions" }`

### GET /api/public/institutions/:slug

- **Purpose:** Fetch a public institution profile.
- **Path params:**
  - `slug: string`
- **Response 200:**
  - `{`
    - `id: number`
    - `slug: string`
    - `name: string`
    - `street_address: string | null`
    - `extended_address: string | null`
    - `city: string | null`
    - `state_province: string | null`
    - `postal_code: string | null`
    - `time_zone: string | null`
    - `country: string | null`
    - `phone_number: string | null`
    - `email_address: string | null`
    - `iabes_member: boolean | null`
    - `theme_colors: unknown | null`
    - `website_url: string | null`
    - `facility_image_url: string | null`
    - `logo_url: string | null`
    - `description: string | null`
    - `social_links: unknown | null`
    - `stats_active: boolean`
    - `latestNews: {`
      - `id: number`
      - `title: string`
      - `content: string`
      - `image_url: string | null`
      - `created_at: string`
    - `} | null`
  - `}`
- **Errors:**
  - `400 { "error": "Invalid request", "details": [...] }`
  - `404 { "error": "Not found" }`
  - `500 { "error": "Unable to load institution" }`

### GET /api/public/institutions/:slug/in-flight

- **Purpose:** List currently in-flight species and quantities for an institution.
- **Path params:**
  - `slug: string`
- **Response 200:**
  - `Array<{`
    - `scientific_name: string`
    - `common_name: string`
    - `image_url: string | null`
    - `quantity: number`
  - `}>`
- **Errors:**
  - `400 { "error": "Invalid request", "details": [...] }`
  - `404 { "error": "Not found" }`
  - `500 { "error": "Unable to load in-flight" }`

### GET /api/public/institutions/:slug/species

- **Purpose:** List species enabled for an institution.
- **Path params:**
  - `slug: string`
- **Response 200:**
  - `Array<{`
    - `scientific_name: string`
    - `common_name: string`
    - `lifespan_days: number`
    - `family: string | null`
    - `sub_family: string | null`
    - `image_url: string | null`
  - `}>`
- **Errors:**
  - `400 { "error": "Invalid request", "details": [...] }`
  - `404 { "error": "Not found" }`
  - `500 { "error": "Unable to load species" }`

### GET /api/public/institutions/:slug/species/:scientific_name

- **Purpose:** Fetch public detail for a global species, applying institution overrides when present.
- **Path params:**
  - `slug: string`
  - `scientific_name: string`
- **Response 200:**
  - `{`
    - `scientific_name: string`
    - `common_name: string`
    - `lifespan_days: number`
    - `family: string | null`
    - `sub_family: string | null`
    - `range: string | null`
    - `description: string | null`
    - `host_plant: string | null`
    - `habitat: string | null`
    - `fun_facts: string | null`
    - `images: string[]`
  - `}`
- **Errors:**
  - `400 { "error": "Invalid request", "details": [...] }`
  - `404 { "error": "Not found" }`
  - `500 { "error": "Unable to load species detail" }`

### GET /api/public/species

- **Purpose:** List global public species catalog summary.
- **Response 200:**
  - `Array<{`
    - `scientific_name: string`
    - `common_name: string`
    - `family: string | null`
    - `sub_family: string | null`
    - `image_url: string | null`
  - `}>`
- **Errors:**
  - `500 { "error": "Unable to load species" }`

## Protected API

Authentication required. Role and tenant scope rules apply per endpoint.

### Users

#### GET /api/users

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`
- **Purpose:** List users in scope.
- **Query params:**
  - `institutionId?: positive integer`
- **Behavior:**
  - No `institutionId`:
    - `SUPERUSER` receives users across all institutions.
    - `ORG_SUPERUSER` and `ADMIN` receive only users from their own institution.
  - With `institutionId`:
    - `SUPERUSER` receives users scoped to that institution.
    - Non-superuser roles can only use their own institution id; cross-tenant override attempts return `403`.
- **Validation:**
  - `institutionId` is optional.
  - If provided, must be a positive integer.
  - Invalid values (e.g. strings, negative numbers, floats) return `400` validation error.
  - Unknown query params are rejected (strict schema enforcement).
- **Response 200:**
  - `Array<{ id: number; name: string; email: string; role: string; institutionId: number }>`
- **Errors:**
  - `400 { "error": "Invalid request", "details": [...] }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`

#### POST /api/users

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`
- **Purpose:** Create user.
- **Body:**
  - `{`
    - `institutionId?: number`
    - `name: string`
    - `email: string`
    - `password: string`
    - `role: "SUPERUSER" | "ORG_SUPERUSER" | "ADMIN" | "EMPLOYEE"`
  - `}`
- **Validation:**
  - Unknown body fields are rejected (strict schema enforcement).
- **Response 201:**
  - `{ id: number; name: string; email: string; role: string; institutionId: number }`
- **Errors:**
  - `400 { "error": "Invalid JSON payload" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `400 { "error": "Institution not found" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `403 { "error": "Tenant required" }`
  - `500 { "error": "Unable to create user" }`

#### GET /api/users/me

- **Roles:** Any authenticated role.
- **Purpose:** Return current authenticated user identity.
- **Response 200:**
  - `{ id: number; name: string; email: string; role: string; institutionId: number }`
- **Errors:**
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`

#### GET /api/users/:id

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`
- **Purpose:** Fetch user by id within scope.
- **Path params:**
  - `id: positive integer`
- **Response 200:**
  - `{ id: number; name: string; email: string; role: string; institutionId: number }`
- **Errors:**
  - `400 { "error": "Invalid user id" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "User not found" }`
  - `500 { "error": "Unable to load user" }`

#### PATCH /api/users/:id

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`
- **Purpose:** Update user fields.
- **Path params:**
  - `id: positive integer`
- **Body:**
  - `{`
    - `institutionId?: number`
    - `name?: string`
    - `email?: string`
    - `password?: string`
    - `role?: "SUPERUSER" | "ORG_SUPERUSER" | "ADMIN" | "EMPLOYEE"`
  - `}`
- **Validation:**
  - Unknown body fields are rejected (strict schema enforcement).
- **Behavior:**
  - Backend enforces role policy regardless of UI.
  - `SUPERUSER` cannot modify their own role.
- **Response 200:**
  - `{ "updated": true }`
- **Errors:**
  - `400 { "error": "Invalid user id" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `400 { "error": "Institution not found" }`
  - `400 { "error": "No updates provided" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `403 { "error": "Tenant required" }`
  - `404 { "error": "User not found" }`
  - `500 { "error": "Unable to update user" }`

#### DELETE /api/users/:id

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`
- **Purpose:** Delete user.
- **Path params:**
  - `id: positive integer`
- **Body:**
  - `{ institutionId?: number }`
- **Behavior:**
  - Backend enforces delete policy regardless of UI.
  - Self-delete is forbidden for all roles, including `SUPERUSER`.
- **Response 200:**
  - `{ "deleted": true }`
- **Errors:**
  - `400 { "error": "Invalid user id" }`
  - `400 { "error": "Invalid JSON payload" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `400 { "error": "Institution not found" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `403 { "error": "Tenant required" }`
  - `404 { "error": "User not found" }`
  - `500 { "error": "Unable to delete user" }`

### Species (Global Management)

#### GET /api/species

- **Roles:** `SUPERUSER`
- **Purpose:** List full global `butterfly_species` records for platform management.
- **Response 200:**
  - `Array<{`
    - `id: number`
    - `scientific_name: string`
    - `common_name: string`
    - `family: string`
    - `sub_family: string`
    - `lifespan_days: number`
    - `range: string[]`
    - `description: string | null`
    - `host_plant: string | null`
    - `habitat: string | null`
    - `fun_facts: string | null`
    - `img_wings_open: string | null`
    - `img_wings_closed: string | null`
    - `extra_img_1: string | null`
    - `extra_img_2: string | null`
    - `created_at: string`
    - `updated_at: string`
  - `}>`
- **Errors:**
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `500 { "error": "Unable to load species" }`

#### POST /api/species

- **Roles:** `SUPERUSER`
- **Purpose:** Create a global butterfly species record.
- **Body:**
  - `{`
    - `scientific_name: string`
    - `common_name: string`
    - `family: string`
    - `sub_family: string`
    - `lifespan_days: number`
    - `range: string[]`
    - `description?: string | null`
    - `host_plant?: string | null`
    - `habitat?: string | null`
    - `fun_facts?: string | null`
    - `img_wings_open?: string | null`
    - `img_wings_closed?: string | null`
    - `extra_img_1?: string | null`
    - `extra_img_2?: string | null`
  - `}`
- **Validation:**
  - Strict schema enforcement (unknown body fields rejected).
  - Input text fields are sanitized server-side.
  - `range` is required (non-null) but may be an empty array when unknown.
- **Uniqueness:**
  - `scientific_name` must be globally unique.
  - Duplicate values return `409`.
- **Response 201:**
  - Created species row object.
- **Errors:**
  - `400 { "error": "Invalid JSON payload" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `409 { "error": "Scientific name already in use" }`
  - `500 { "error": "Unable to create species" }`

#### PATCH /api/species/:id

- **Roles:** `SUPERUSER`
- **Purpose:** Update a global butterfly species by numeric id.
- **Path params:**
  - `id: positive integer`
- **Body:**
  - Partial subset of species fields accepted by server validation.
- **Validation:**
  - Strict schema enforcement (unknown body fields rejected).
  - Requires at least one valid field.
  - Input text fields are sanitized server-side.
  - `range` may be set to an empty array when unknown.
- **Uniqueness:**
  - Updating `scientific_name` enforces global uniqueness excluding the current record.
- **Response 200:**
  - Updated species row object.
- **Errors:**
  - `400 { "error": "Invalid JSON payload" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "Species not found" }`
  - `409 { "error": "Scientific name already in use" }`
  - `500 { "error": "Unable to update species" }`

#### DELETE /api/species/:id

- **Roles:** `SUPERUSER`
- **Purpose:** Delete a global butterfly species by numeric id.
- **Path params:**
  - `id: positive integer`
- **Response 200:**
  - `{ "deleted": true }`
- **Errors:**
  - `400 { "error": "Invalid request", "details": [...] }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "Species not found" }`
  - `500 { "error": "Unable to delete species" }`

### Institution

#### GET /api/institution

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN` (with valid tenant context)
- **Purpose:** Fetch current tenant institution profile.
- **Response 200:**
  - Institution row object for current tenant.
- **Errors:**
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "Institution not found" }`
  - `500 { "error": "Unable to load institution" }`

#### PATCH /api/institution

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN` (with valid tenant context)
- **Purpose:** Update current tenant institution profile.
- **Body:**
  - Partial institution profile fields accepted by server validation.
- **Response 200:**
  - Updated institution row object.
- **Errors:**
  - `400 { "error": "Invalid JSON payload" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "Institution not found" }`
  - `500 { "error": "Unable to update institution" }`

### Platform Institutions

#### GET /api/institutions

- **Roles:** `SUPERUSER`
- **Purpose:** List all institutions across tenants.
- **Response 200:**
  - `Array<{ id: number; slug: string; name: string }>`
- **Errors:**
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `500 { "error": "Unable to load institutions" }`

#### POST /api/institutions

- **Roles:** `SUPERUSER`
- **Purpose:** Create a new institution.
- **Body:**
  - `{`
    - `slug: string`
    - `name: string`
    - `street_address: string`
    - `extended_address?: string | null`
    - `city: string`
    - `state_province: string`
    - `postal_code: string`
    - `time_zone?: string | null`
    - `country: string`
    - `phone_number?: string | null`
    - `email_address?: string | null` (empty string is normalized to `null`)
    - `iabes_member?: boolean`
    - `theme_colors?: string[]`
    - `website_url?: string | null`
    - `facility_image_url?: string | null`
    - `logo_url?: string | null`
    - `description?: string | null`
    - `social_links?: Record<string, unknown>`
    - `stats_active?: boolean`
  - `}`
- **Response 201:**
  - Created institution row object.
- **Errors:**
  - `400 { "error": "Invalid JSON payload" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `400 { "error": "Slug already in use" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `500 { "error": "Unable to create institution" }`

#### GET /api/institutions/:id

- **Roles:** `SUPERUSER`
- **Purpose:** Fetch full institution detail by id.
- **Path params:**
  - `id: positive integer`
- **Response 200:**
  - Institution row object.
- **Errors:**
  - `400 { "error": "Invalid institution id" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "Institution not found" }`
  - `500 { "error": "Unable to load institution" }`

#### PATCH /api/institutions/:id

- **Roles:** `SUPERUSER`
- **Purpose:** Update institution by id (`id` is immutable; unknown keys are rejected).
- **Path params:**
  - `id: positive integer`
- **Body:**
  - Partial institution profile fields accepted by server validation.
  - `email_address` empty string is normalized to `null`.
- **Response 200:**
  - Updated institution row object.
- **Errors:**
  - `400 { "error": "Invalid institution id" }`
  - `400 { "error": "Invalid JSON payload" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `400 { "error": "Slug already in use" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "Institution not found" }`
  - `500 { "error": "Unable to update institution" }`

### Shipments

#### GET /api/shipments

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`, `EMPLOYEE`
- **Purpose:** List shipments in scope.
- **Response 200:**
  - `Array<{`
    - `id: number`
    - `supplierCode: string`
    - `shipmentDate: string`
    - `arrivalDate: string`
    - `createdAt: string`
  - `}>`
- **Errors:**
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `500 { "error": "Unable to load shipments" }`

#### POST /api/shipments

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`, `EMPLOYEE`
- **Purpose:** Create shipment header and shipment items.
- **Body:**
  - `{`
    - `institutionId?: number`
    - `supplierCode: string`
    - `shipmentDate: string`
    - `arrivalDate: string`
    - `items: Array<{`
      - `butterflySpeciesId: number`
      - `numberReceived: number`
      - `emergedInTransit: number`
      - `damagedInTransit: number`
      - `diseasedInTransit: number`
      - `parasite: number`
      - `nonEmergence: number`
      - `poorEmergence: number`
    - `}>`
  - `}`
- **Note:** `SUPERUSER` must include `institutionId` in payload for write operations.
- **Response 201:**
  - `{ id: number; itemCount: number }`
- **Errors:**
  - `400 { "error": "Invalid JSON payload" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `400 { "error": "Institution not found" }`
  - `400 { "error": "Supplier not found" }`
  - `400 { "error": "One or more species are invalid" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `403 { "error": "Tenant required" }`
  - `500 { "error": "Unable to create shipment" }`

#### GET /api/shipments/:id

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`, `EMPLOYEE`
- **Purpose:** Fetch shipment header and items.
- **Path params:**
  - `id: positive integer`
- **Response 200:**
  - `{`
    - `shipment: {`
      - `id: number`
      - `supplierCode: string`
      - `shipmentDate: string`
      - `arrivalDate: string`
      - `createdAt: string`
    - `}`
    - `items: Array<{`
      - `id: number`
      - `butterflySpeciesId: number`
      - `numberReceived: number`
      - `emergedInTransit: number`
      - `damagedInTransit: number`
      - `diseasedInTransit: number`
      - `parasite: number`
      - `nonEmergence: number`
      - `poorEmergence: number`
      - `scientificName: string`
      - `imageUrl: string | null`
    - `}>`
  - `}`
- **Errors:**
  - `400 { "error": "Invalid shipment id" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "Shipment not found" }`
  - `500 { "error": "Unable to load shipment" }`

#### PATCH /api/shipments/:id

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`, `EMPLOYEE`
- **Purpose:** Update shipment header and/or shipment item metrics.
- **Path params:**
  - `id: positive integer`
- **Body:**
  - `{`
    - `institutionId?: number`
    - `supplierCode?: string`
    - `shipmentDate?: string`
    - `arrivalDate?: string`
    - `items?: Array<{`
      - `id: number`
      - `numberReceived: number`
      - `emergedInTransit: number`
      - `damagedInTransit: number`
      - `diseasedInTransit: number`
      - `parasite: number`
      - `nonEmergence: number`
      - `poorEmergence: number`
    - `}>`
  - `}`
- **Note:** `SUPERUSER` must include `institutionId` in payload for write operations.
- **Response 200:**
  - `{ "updated": number }` (count of updated items)
- **Errors:**
  - `400 { "error": "Invalid shipment id" }`
  - `400 { "error": "Invalid JSON payload" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `400 { "error": "Institution not found" }`
  - `400 { "error": "Arrival date must be on or after shipment date" }`
  - `400 { "error": "Supplier not found" }`
  - `400 { "error": "One or more items do not belong to this shipment" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `403 { "error": "Tenant required" }`
  - `404 { "error": "Shipment not found" }`
  - `500 { "error": "Unable to update shipment" }`

#### DELETE /api/shipments/:id

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`, `EMPLOYEE`
- **Purpose:** Delete shipment by id within scope.
- **Path params:**
  - `id: positive integer`
- **Body:**
  - `{ institutionId?: number }`
- **Response 200:**
  - `{ "deleted": true }`
- **Errors:**
  - `400 { "error": "Invalid shipment id" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `400 { "error": "Institution not found" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `403 { "error": "Tenant required" }`
  - `404 { "error": "Shipment not found" }`

### Releases

#### POST /api/shipments/:shipmentId/releases

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`, `EMPLOYEE`
- **Purpose:** Create a release event from an existing shipment.
- **Path params:**
  - `shipmentId: positive integer`
- **Body:**
  - `{`
    - `released_at?: string`
    - `created_by?: string`
  - `}`
- **Response 201:**
  - `{`
    - `id: number`
    - `institution_id: number`
    - `shipment_id: number`
    - `release_date: string`
    - `released_by: string`
    - `created_at: string`
    - `updated_at: string`
  - `}`
- **Errors:**
  - `400 { "error": "Invalid shipment id" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "Shipment not found" }`
  - `500 { "error": "Unable to create release" }`

### In-Flight

#### POST /api/releases/:releaseId/in-flight

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`, `EMPLOYEE`
- **Purpose:** Add in-flight allocation row to a release.
- **Path params:**
  - `releaseId: positive integer`
- **Body:**
  - `{`
    - `shipment_item_id: number`
    - `quantity: number`
  - `}`
- **Response 201:**
  - `{`
    - `id: number`
    - `institution_id: number`
    - `release_event_id: number`
    - `shipment_item_id: number`
    - `quantity: number`
    - `created_at: string`
    - `updated_at: string`
  - `}`
- **Errors:**
  - `400 { "error": "Invalid release id" }`
  - `400 { "error": "Invalid JSON payload" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `400 { "error": "Invalid shipment_item" }`
  - `400 { "error": "Quantity exceeds remaining" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "Release not found" }`
  - `500 { "error": "Unable to add in-flight" }`

#### PATCH /api/in-flight/:id

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`, `EMPLOYEE`
- **Purpose:** Update in-flight quantity.
- **Path params:**
  - `id: positive integer`
- **Body:**
  - `{ quantity: number }`
- **Response 200:**
  - `{`
    - `id: number`
    - `institution_id: number`
    - `release_event_id: number`
    - `shipment_item_id: number`
    - `quantity: number`
    - `created_at: string`
    - `updated_at: string`
  - `}`
- **Errors:**
  - `400 { "error": "Invalid in-flight id" }`
  - `400 { "error": "Invalid JSON payload" }`
  - `400 { "error": "Invalid request", "details": [...] }`
  - `400 { "error": "Quantity exceeds remaining" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "In-flight row not found" }`
  - `500 { "error": "Unable to update in-flight" }`

#### DELETE /api/in-flight/:id

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`, `EMPLOYEE`
- **Purpose:** Delete in-flight row.
- **Path params:**
  - `id: positive integer`
- **Response 204:**
  - No body.
- **Errors:**
  - `400 { "error": "Invalid in-flight id" }`
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
  - `404 { "error": "In-flight row not found" }`
  - `500 { "error": "Unable to delete in-flight" }`

### Suppliers

#### GET /api/suppliers

- **Roles:** `SUPERUSER`, `ORG_SUPERUSER`, `ADMIN`, `EMPLOYEE`
- **Purpose:** List suppliers in scope.
- **Query params:**
  - `institutionId?: number` (only meaningful for `SUPERUSER` cross-tenant read)
- **Response 200:**
  - `Array<{`
    - `id: number`
    - `name: string`
    - `code: string`
    - `country: string | null`
    - `websiteUrl: string | null`
    - `isActive: boolean`
  - `}>`
- **Errors:**
  - `401 { "error": "Unauthorized" }`
  - `403 { "error": "Forbidden" }`
