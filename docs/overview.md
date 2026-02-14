# Flutr — Architecture Overview

## About

Flutr is a multi-tenant web application for butterfly houses to manage butterfly species, track shipments, monitor quality metrics, and provide public-facing educational experiences. Built as a Senior Design project with WCAG 2.1 AA compliance as a core requirement.

## Architecture

### Multi-Tenant Design

Flutr uses a shared database with institution-level data isolation:

- The `[institution]` dynamic route segment scopes all pages to a specific institution
- Every data table references an `institution_id` foreign key
- Authentication tokens carry `institutionId` for server-side filtering
- The `butterfly_species` table is global (shared reference data); `butterfly_species_institution` adds per-institution customization

### Route Groups

```
/login                              # Public login page
/[institution]/(admin)/dashboard    # Protected — admin dashboard
/[institution]/(admin)/inventory    # Protected — butterfly inventory
/[institution]/(admin)/shipments    # Protected — shipment list
/[institution]/(admin)/shipments/add # Protected — add shipment
/[institution]/(public)/            # Public — institution landing page
/[institution]/(public)/stats       # Public — institution statistics
/[institution]/(public)/[butterfly] # Public — species detail page
```

- `(admin)` routes are protected by NextAuth middleware
- `(public)` routes are accessible without authentication

### Authentication Flow

1. User submits email/password to `/login`
2. NextAuth credentials provider verifies via bcrypt
3. JWT token is issued with `role` and `institutionId` claims
4. Middleware intercepts `(admin)` routes and checks session validity
5. Server components/API routes use `auth()` to access session data

### Database Layer

PostgreSQL 17 managed via Drizzle ORM:

- Schema defined in `src/lib/schema.ts`
- Client singleton in `src/lib/db.ts`
- Migrations in `drizzle/` directory
- Docker Compose for local development

### Component Architecture

- **Shadcn/UI**: 55+ pre-installed primitives in `src/components/ui/`
- **Feature components**: Organized by domain (`admin/`, `auth/`, `public/`)
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for statistics dashboards
- **Theming**: next-themes for light/dark mode

## Data Model

### Core Entities

- **Institution** — A butterfly house organization (address, contact, branding)
- **User** — An account scoped to an institution with a role
- **Butterfly Species** — Global scientific reference data
- **Butterfly Species Institution** — Institution-specific species details (common name, description, image)
- **Supplier** — Butterfly vendor/supplier
- **Shipment** — A butterfly shipment record with quality/damage tracking metrics

### Key Relationships

```
Institution ─┬─ Users
              ├─ Butterfly Species Institution ── Butterfly Species (global)
              └─ Shipments ─┬─ Butterfly Species (global)
                            └─ Supplier
```

## API Routes

| Endpoint                  | Purpose                 |
| ------------------------- | ----------------------- |
| `/api/auth/[...nextauth]` | NextAuth authentication |
| `/api/users`              | User management         |
| `/api/institution`        | Institution management  |

## Infrastructure

### Local Development

```bash
docker compose up -d       # Start PostgreSQL
pnpm db:push               # Sync schema
pnpm dev                   # Start Next.js dev server
```

### Environment Variables

| Variable          | Description                  |
| ----------------- | ---------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth encryption secret   |
| `NEXTAUTH_URL`    | Application base URL         |
