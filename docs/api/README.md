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
- `403` permission violation OR wrong-tenant slug (slug exists but belongs to a different institution)
- `404` resource does not exist
- `400` invalid input
- `409` conflict (unique constraint / semantic conflict)
- `500` internal error

### Tenant Context Model

All tenant routes use `x-tenant-slug` for tenant context:

- All tenant routes require the `x-tenant-slug` request header.
- Missing header returns `400 INVALID_REQUEST`.
- SUPERUSER may supply any valid slug.
- Non-SUPERUSER may only supply their own institution's slug — any other slug returns `403 FORBIDDEN`.

#### SUPERUSER tenant access

- SUPERUSER does **not** use `institutionId` in tenant routes — there is no mechanism to do so.
- All cross-tenant access is performed via the `x-tenant-slug` header, identical to any other user.
- `resolveTenantBySlug` skips the institution match check for SUPERUSER and resolves any valid slug.

### Slug vs ID Rule

- **Slug** (`x-tenant-slug` header) — used exclusively for tenant context in tenant routes.
- **ID** (URL path segment) — used exclusively to target a specific platform resource in platform routes.
- No tenant route accepts `institutionId` in a body or query parameter.

### Authorization & tenant rules

- API routes must never do raw role checks (no `user.role === ...`).
- All authz must go through `src/lib/authz.ts` `canX(...)` helpers.
- All tenant enforcement must go through `src/lib/tenant.ts`:
  - `resolveTenantBySlug(user, slug)` — reads tenant from the `x-tenant-slug` request header; non-SUPERUSER may only access their own institution's slug.
  - `tenantCondition(...)` — query layer only; must not be relied on for access control at the route level.

### Validation rules

- All input must be validated using Zod schemas with `.strict()`.
- All user-provided text must be sanitized using `sanitizeText` in the validation layer only.
- Params/query schemas live in `src/lib/validation/*` alongside body schemas.
- `institutionId` must not appear in any body or query schema for tenant routes.

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
  - missing `x-tenant-slug` header (400) — one per HTTP method, for all tenant routes
  - wrong-tenant access (slug mismatch) returns 403

### Endpoint index

#### Public routes

- `GET /api/public/institutions` — list institutions
- `GET /api/public/institutions/[slug]` — institution details
- `GET /api/public/institutions/[slug]/gallery` — public gallery
- `GET /api/public/institutions/[slug]/in-flight` — in-flight for institution (lifespan-filtered currently alive)
- `GET /api/public/institutions/[slug]/species` — species visible for institution
- `GET /api/public/institutions/[slug]/species/[scientific_name]` — species detail within institution
- `GET /api/public/species` — global species list

#### Tenant routes (all require `x-tenant-slug` header)

- `GET/POST /api/tenant/shipments` — list paginated shipments & create shipments
- `GET/PATCH/DELETE /api/tenant/shipments/[id]` — shipment detail, update, delete
- `GET /api/tenant/species` — list tenant-visible species with applied overrides
- `PATCH /api/tenant/species/[id]` — upsert tenant override fields for a species
- `GET /api/tenant/releases` — list paginated release events for the institution
- `POST /api/tenant/shipments/[id]/releases` — create release event with multiple shipment items
- `POST /api/tenant/releases/[releaseId]/in-flight` — add one in-flight row to an existing release event
- `PATCH/DELETE /api/tenant/in-flight/[id]` — update or remove an in-flight row
- `GET/PATCH/DELETE /api/tenant/releases/[releaseId]` — release detail, quantity updates, and delete
- `GET /api/tenant/suppliers` — list global suppliers available to tenant shipment forms
- `GET/POST /api/tenant/users` — list and create users for a tenant
- `GET/PATCH/DELETE /api/tenant/users/[id]` — user detail, update, delete
- `GET/PATCH /api/tenant/institution` — tenant institution profile
- `GET /api/tenant/shipments/[id]/releases` — list release events for a shipment
- `GET/POST /api/tenant/news` — list and create institution news entries
- `PATCH/DELETE /api/tenant/news/[id]` — update or delete a news entry

#### Platform routes

- `GET/POST /api/platform/institutions` — list & create institutions
- `GET/PATCH/DELETE /api/platform/institutions/[id]` — institution detail, update, delete
- `GET/POST /api/platform/species` — list and create global species
- `GET/PATCH/DELETE /api/platform/species/[id]` — species detail, update, delete
- `GET/POST /api/platform/suppliers` — list & create global suppliers
- `GET/PATCH/DELETE /api/platform/suppliers/[id]` — global supplier detail, update, delete

### Platform species create/update contract

`POST /api/platform/species` accepts a full species payload.

`PATCH /api/platform/species/[id]` accepts any subset of the same fields, but at least one field is required.

`fun_facts` shape:

```json
[
  {
    "title": "Fun Fact",
    "fact": "Adults can glide for long distances."
  },
  {
    "title": "Fun Fact",
    "fact": "Larvae prefer citrus host plants."
  }
]
```

Example request body:

```json
{
  "scientific_name": "Papilio glaucus",
  "common_name": "Eastern Tiger Swallowtail",
  "family": "Papilionidae",
  "sub_family": "Papilioninae",
  "lifespan_days": 14,
  "range": ["North America"],
  "description": "A striking yellow butterfly species",
  "host_plant": "Willow",
  "habitat": "Woodlands",
  "fun_facts": [
    { "title": "Fun Fact", "fact": "Adults can glide for long distances." },
    { "title": "Fun Fact", "fact": "Larvae prefer citrus host plants." }
  ],
  "img_wings_open": "https://example.com/open.jpg",
  "img_wings_closed": "https://example.com/closed.jpg"
}
```

Notes:

- `fun_facts` is optional.
- When provided, `fun_facts` must be a non-empty array of `{ title, fact }` objects.
- `PATCH` replaces the full `fun_facts` array; it does not append a single fact item.
- The legacy string format for `fun_facts` is no longer accepted.

### Public species detail contract

`GET /api/public/institutions/[slug]/species/[scientific_name]` response shape:

```json
{
  "species": {
    "speciesId": 10,
    "scientific_name": "Papilio glaucus",
    "common_name": "Eastern Tiger Swallowtail",
    "common_name_override": null,
    "lifespan_days": 14,
    "lifespan_override": null,
    "description": "A striking yellow butterfly species",
    "host_plant": "Willow",
    "habitat": "Woodlands",
    "fun_facts": [
      { "title": "Fun Fact", "fact": "Adults can glide for long distances." },
      { "title": "Fun Fact", "fact": "Larvae prefer citrus host plants." }
    ],
    "img_wings_open": "https://example.com/open.jpg",
    "img_wings_closed": "https://example.com/closed.jpg",
    "extra_img_1": null,
    "extra_img_2": null
  }
}
```

### Tenant shipments list contract

`GET /api/tenant/shipments` supports pagination with query params:

- `page` (number, default `1`)
- `limit` (number, default `50`)

Response shape:

```json
{
  "shipments": [
    {
      "id": 1,
      "supplierCode": "SUP-1",
      "shipmentDate": "2026-01-10T00:00:00.000Z",
      "arrivalDate": "2026-01-11T00:00:00.000Z",
      "createdAt": "2026-01-12T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

### Tenant shipment detail contract

`GET /api/tenant/shipments/[id]` response shape:

```json
{
  "shipment": {
    "id": 1,
    "supplierCode": "SUP-1",
    "shipmentDate": "2026-01-10T00:00:00.000Z",
    "arrivalDate": "2026-01-11T00:00:00.000Z",
    "createdAt": "2026-01-12T00:00:00.000Z"
  },
  "items": []
}
```

### DELETE /api/tenant/shipments/[id]

Returns `409 CONFLICT` if the shipment has any dependent records:

- `shipment_items` exist for this shipment, **or**
- `release_events` exist for this shipment

Returns `200 OK` with `{ "deleted": true }` when the shipment has no dependencies and is successfully deleted.

Returns `404 NOT_FOUND` if the shipment does not exist.

### Tenant releases list contract

`GET /api/tenant/releases` supports pagination with query params (mirrors the
shipments list shape):

- `page` (number, default `1`)
- `limit` (number, default `50`, max `200`)

Response shape:

```json
{
  "releases": [
    {
      "id": 9,
      "shipmentId": 55,
      "supplierCode": "SUP-1",
      "shipmentDate": "2026-03-01T00:00:00.000Z",
      "releaseDate": "2026-03-13T00:00:00.000Z",
      "releasedBy": "Alice",
      "totalReleased": 25
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

Returns `400 INVALID_REQUEST` for non-numeric `page` / `limit` values or
`limit` > 200.

### Tenant release detail contract

`GET /api/tenant/releases/[releaseId]`, `PATCH /api/tenant/releases/[releaseId]`, and
`DELETE /api/tenant/releases/[releaseId]` all require the `x-tenant-slug` header.

`PATCH /api/tenant/releases/[releaseId]` body shape:

```json
{
  "items": [
    {
      "shipment_item_id": 101,
      "quantity": 8
    }
  ]
}
```

`GET /api/tenant/releases/[releaseId]` response shape:

```json
{
  "event": {
    "id": 500,
    "shipmentId": 55,
    "releaseDate": "2026-03-13T12:00:00.000Z",
    "releasedBy": "Release Admin"
  },
  "items": [
    {
      "id": 1,
      "shipmentItemId": 101,
      "quantity": 8
    }
  ]
}
```

### Tenant institution PATCH contract

`PATCH /api/tenant/institution` accepts any subset of the following fields:

- `name`, `street_address`, `extended_address`, `city`, `state_province`, `postal_code`, `country` — address fields
- `phone_number`, `email_address`, `website_url`, `volunteer_url`, `donation_url`, `facility_image_url`, `logo_url` — contact/media
- `description` — text (max 2000 chars)
- `time_zone` — text (max 100 chars)
- `theme_colors` — array of strings
- `social_links` — record of string key/value pairs
- `stats_active` — boolean

### Tenant news contract

`GET /api/tenant/news` — lists news for the institution identified by `x-tenant-slug`.

`POST /api/tenant/news` body shape:

```json
{
  "title": "Butterfly Season Opens",
  "content": "Come visit us this spring!",
  "image_url": "https://example.com/img.jpg",
  "is_active": true
}
```

- `title` and `content` are required. `image_url` and `is_active` are optional.

`PATCH /api/tenant/news/[id]` body shape: any subset of `title`, `content`, `image_url`, `is_active`.

Response shape for list:

```json
{
  "news": [
    {
      "id": 1,
      "institution_id": 1,
      "title": "...",
      "content": "...",
      "image_url": null,
      "is_active": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

Response shape for create/update:

```json
{
  "news": {
    "id": 1,
    "institution_id": 1,
    "title": "...",
    "content": "...",
    "image_url": null,
    "is_active": true,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### Tenant enforcement — tenant context reference

All tenant routes use the `x-tenant-slug` header for tenant context. Missing header returns `400 INVALID_REQUEST`. SUPERUSER may use any slug; non-SUPERUSER attempting a mismatched slug receives `403 FORBIDDEN`.

| Route                                    | Method(s)          | Tenant source          |
| ---------------------------------------- | ------------------ | ---------------------- |
| `/tenant/users`                          | GET, POST          | `x-tenant-slug` header |
| `/tenant/users/[id]`                     | GET, PATCH, DELETE | `x-tenant-slug` header |
| `/tenant/institution`                    | GET, PATCH         | `x-tenant-slug` header |
| `/tenant/suppliers`                      | GET                | `x-tenant-slug` header |
| `/tenant/species`                        | GET                | `x-tenant-slug` header |
| `/tenant/species/[id]`                   | PATCH              | `x-tenant-slug` header |
| `/tenant/news`                           | GET, POST          | `x-tenant-slug` header |
| `/tenant/news/[id]`                      | PATCH, DELETE      | `x-tenant-slug` header |
| `/tenant/shipments`                      | GET, POST          | `x-tenant-slug` header |
| `/tenant/shipments/[id]`                 | GET, PATCH, DELETE | `x-tenant-slug` header |
| `/tenant/shipments/[id]/releases`        | GET, POST          | `x-tenant-slug` header |
| `/tenant/releases`                       | GET                | `x-tenant-slug` header |
| `/tenant/releases/[releaseId]`           | GET, PATCH, DELETE | `x-tenant-slug` header |
| `/tenant/releases/[releaseId]/in-flight` | POST               | `x-tenant-slug` header |
| `/tenant/in-flight/[id]`                 | PATCH, DELETE      | `x-tenant-slug` header |

### Tenant suppliers contract

Tenant supplier reads return the global supplier list. The `x-tenant-slug` header is still required
for authentication, authorization, and tenant-route consistency, but suppliers are not owned by that
institution.

Response shape:

```json
{
  "suppliers": [
    { "id": 1, "name": "Butterfly Farm", "code": "BF-1", "country": "CR", "isActive": true }
  ]
}
```

### Tenant species list contract

Response shape:

```json
{
  "species": [
    {
      "id": 10,
      "scientificName": "Papilio glaucus",
      "commonName": "Eastern Tiger Swallowtail",
      "commonNameOverride": null,
      "lifespanDays": 14,
      "lifespanOverride": null
    }
  ]
}
```

### Tenant species override PATCH contract

`PATCH /api/tenant/species/[id]` body shape:

```json
{
  "common_name_override": "Tiger Swallowtail",
  "lifespan_override": 18
}
```

- At least one of `common_name_override` or `lifespan_override` must be present.
- Either field can be set to `null` to clear the override.

### Tenant shipments/[id]/releases contract

`GET /api/tenant/shipments/[id]/releases` response shape:

```json
{
  "releaseEvents": [
    {
      "id": 500,
      "shipmentId": 55,
      "releaseDate": "2026-03-13T12:00:00.000Z",
      "releasedBy": "Release Admin"
    }
  ]
}
```

`POST /api/tenant/shipments/[id]/releases` body shape:

```json
{
  "released_at": "2026-03-13T12:00:00.000Z",
  "items": [{ "shipment_item_id": 101, "quantity": 20 }]
}
```

- `released_at` is optional. `items` is required (min 1, no duplicate `shipment_item_id`).

### Tenant in-flight row contracts

`PATCH /api/tenant/in-flight/[id]` body:

```json
{ "quantity": 5 }
```

`DELETE /api/tenant/in-flight/[id]` — no body or query params required. Returns `200 OK` with `{ "deleted": true }` on success.

### Tenant releases/[releaseId]/in-flight contract

`POST /api/tenant/releases/[releaseId]/in-flight` body shape:

```json
{
  "shipment_item_id": 101,
  "quantity": 3
}
```

- `shipment_item_id` and `quantity` are required.

## Test file layout recommendation

Mirror the route structure so it's always obvious what's covered:

- `src/__test__/api/public/institutions.route.test.ts`
- `src/__test__/api/public/institutions.slug.route.test.ts`
- `src/__test__/api/public/institutions.slug.gallery.route.test.ts`
- `src/__test__/api/public/inflight.route.test.ts`
- `src/__test__/api/public/institutions.slug.species.route.test.ts`
- `src/__test__/api/public/institutions.slug.species.scientific-name.route.test.ts`
- `src/__test__/api/public/species.route.test.ts`

- `src/__test__/api/tenant/shipments.route.test.ts`
- `src/__test__/api/tenant/releases.route.test.ts`
- `src/__test__/api/tenant/inflight.route.test.ts`
- `src/__test__/api/tenant/institution.route.test.ts`
- `src/__test__/api/tenant/suppliers.route.test.ts`
- `src/__test__/api/tenant/species.route.test.ts`
- `src/__test__/api/tenant/users.route.test.ts`
- `src/__test__/api/tenant/news.route.test.ts`
- `src/__test__/api/platform/institutions.route.test.ts`
- `src/__test__/api/platform/suppliers.route.test.ts`
- `src/__test__/api/platform/species.route.test.ts`
