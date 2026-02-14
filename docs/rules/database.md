# Database Conventions

## Schema

- All tables defined in `src/lib/schema.ts` using Drizzle ORM
- Use `pgTable()` for table definitions
- All tables include `createdAt` and `updatedAt` timestamps

## Client

- Import `db` from `@/lib/db` — singleton Drizzle client
- Import table definitions from `@/lib/schema`

## Migrations

- Schema changes: edit `src/lib/schema.ts`, then run `pnpm db:generate` + `pnpm db:migrate`
- Quick prototyping: use `pnpm db:push` to sync schema without migration files
- Use `pnpm db:studio` for visual database browsing

## Multi-Tenant Queries

- Always filter by `institution_id` for tenant-scoped data
- Use cascade deletes (already configured in schema foreign keys)
- The `butterfly_species` table is global; `butterfly_species_institution` is per-tenant

## Docker

- PostgreSQL 17 via `docker-compose.yml`
- Default credentials: `postgres:postgres`, database: `flutr-db`
- Start with `docker compose up -d`
