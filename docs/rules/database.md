# Database Conventions

## Schema

- All tables defined in `src/lib/schema.ts` using Drizzle ORM
- Use `pgTable()` for table definitions
- All tables include `created_at` and `updated_at` timestamps

## Client

- Import `db` from `@/lib/db` — singleton Drizzle client
- Import table definitions from `@/lib/schema`

## Migrations

- Schema changes: edit `src/lib/schema.ts`, then run `pnpm db:generate` + `pnpm db:migrate`
- Quick prototyping: use `pnpm db:push` to sync schema without migration files
- Use `pnpm db:studio` for visual database browsing

## Multi-Tenant Queries

- Always filter by `institution_id` for tenant-scoped data
- Foreign keys use a mix of `CASCADE` and `RESTRICT`; verify behavior per relationship
- The `butterfly_species` table is global; `butterfly_species_institution` is per-tenant

## Tenant Composite-Key Enforcement

Tenant isolation is enforced at the database level using composite foreign keys that include `institution_id`.

- `shipments (institution_id, supplier_code) -> suppliers (institution_id, code)` — `RESTRICT`
- `shipment_items (institution_id, shipment_id) -> shipments (institution_id, id)` — `CASCADE`
- `release_events (institution_id, shipment_id) -> shipments (institution_id, id)` — `CASCADE`
- `in_flight (institution_id, release_event_id) -> release_events (institution_id, id)` — `CASCADE`
- `in_flight (institution_id, shipment_item_id) -> shipment_items (institution_id, id)` — `RESTRICT`

This prevents cross-tenant references even if a raw numeric ID exists in another institution.

## Docker

- PostgreSQL 17 via `docker-compose.yml`
- Default credentials: `postgres:postgres`, database: `flutr-db`
- Start with `docker compose up -d`
