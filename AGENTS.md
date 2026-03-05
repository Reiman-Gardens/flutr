# Flutr

A WCAG-compliant, multi-tenant web application for butterfly houses to track shipments, quality metrics, and historical records while delivering public-facing galleries and statistics.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS 4
- **UI**: Shadcn/UI (Radix-based), Lucide icons, Sonner toasts
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Auth**: NextAuth 5 (credentials provider, JWT sessions)
- **Database**: PostgreSQL 17 (Docker) + Drizzle ORM
- **Testing**: Jest
- **Deployment**: Docker Compose (PostgreSQL)

## Project Structure

```
src/
├── app/                    # Next.js pages and API routes
│   ├── page.tsx            # Root public landing page
│   ├── login/              # Login page
│   ├── [institution]/      # Multi-tenant institution routes
│   │   ├── (admin)/        # Protected admin routes
│   │   │   ├── dashboard/  # Admin dashboard
│   │   │   ├── inventory/  # Butterfly inventory management
│   │   │   └── shipments/  # Shipment tracking (list + add)
│   │   └── (public)/       # Public-facing routes
│   │       ├── stats/      # Institution statistics
│   │       └── [butterfly]/ # Individual species detail
│   └── api/                # API routes
│       ├── auth/[...nextauth]/ # NextAuth handlers
│       ├── public/         # Public no-auth API routes
│       ├── tenant/         # Tenant-scoped authenticated API routes
│       ├── platform/       # Platform/SUPERUSER API routes
│       ├── users/          # Legacy compatibility route
│       └── institution/    # Legacy compatibility route
├── components/             # React components by feature
│   ├── admin/              # Admin-specific components
│   ├── auth/               # Auth-specific components
│   ├── public/             # Public-facing components
│   └── ui/                 # 55 Shadcn/UI primitives
├── hooks/                  # Custom React hooks
│   └── use-mobile.ts       # Responsive design hook
├── lib/                    # Utilities and configuration
│   ├── api-response.ts     # Standard API response helpers
│   ├── authz.ts            # Authorization policy helpers
│   ├── db.ts               # Drizzle ORM client
│   ├── schema.ts           # Database schema definitions
│   ├── tenant.ts           # Tenant resolution/enforcement helpers
│   ├── validation/         # Zod schemas + request/query helpers
│   ├── logger.ts           # Dev-only logging utility
│   └── utils.ts            # Tailwind class merging (cn)
├── types/                  # TypeScript type definitions
│   └── next-auth.d.ts      # NextAuth session augmentation
└── __test__/               # Jest test files
docs/                       # Project documentation
drizzle/                    # Generated database migrations
```

## Commands

```bash
pnpm dev            # Start dev server
pnpm build          # Production build
pnpm start          # Start production server
pnpm lint           # ESLint check
pnpm test           # Run Jest tests
pnpm format         # Format code with Prettier
pnpm format:check   # Check code formatting
pnpm db:generate    # Generate Drizzle migrations
pnpm db:migrate     # Run database migrations
pnpm db:push        # Push schema to database
pnpm db:studio      # Open Drizzle Studio GUI
```

## Key Patterns

- Path alias: `@/` maps to `/src/`
- Multi-tenant routing: `[institution]` dynamic segment isolates data per institution
- Route groups: `(admin)` for protected routes, `(public)` for public-facing pages
- Client components marked with `"use client"`
- Auth: NextAuth 5 with credentials provider, JWT tokens carry `role` and `institutionId`
- Middleware: Protects `/:institution/(admin)/*` routes via NextAuth
- Database: Drizzle ORM with typed schema, PostgreSQL via Docker Compose
- UI components: Shadcn/UI installed via CLI, located in `src/components/ui/`
- Forms: React Hook Form with Zod schema validation
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`)

## Database Tables

- `institutions` — Multi-tenant organizations (slug, name, full address fields, IABES membership, stats_active flag, theming, contact info, timestamps)
- `institution_news` — Institution-specific news entries (institution_id, title, content, is_active, optional image_url, timestamps)
- `users` — User accounts tied to an institution (name, globally unique email, password_hash, role, institution_id, timestamps)
- `butterfly_species` — Global master species catalog (scientific_name, common_name, family, sub_family, lifespan_days, range, optional description, host_plant, habitat, fun_facts, image fields: img_wings_open, img_wings_closed, extra_img_1, extra_img_2, timestamps)
- `butterfly_species_institution` — Institution-specific overrides for global species (butterfly_species_id, institution_id, optional common_name_override, lifespan_override, timestamps)
- `suppliers` — Butterfly suppliers/vendors (institution_id, name, code, country, is_active, optional website_url, timestamps)
- `shipments` — Shipment headers (institution_id, supplier_code, shipment_date, arrival_date, timestamps)
- `shipment_items` — Shipment line items per species (institution_id, shipment_id, butterfly_species_id, number_received, emerged_in_transit, damaged_in_transit, diseased_in_transit, parasite, non_emergence, poor_emergence, timestamps)
- `release_events` — Butterfly release events (institution_id, shipment_id, release_date, released_by, created_at, updated_at)
- `in_flight` — Species released during a release event (institution_id, release_event_id, shipment_item_id, quantity, created_at, updated_at)

## Documentation

Detailed documentation lives in `docs/`:

- `docs/overview.md` — Architecture overview
- `docs/rules/` — Development rules and conventions (centralized, referenced by both Claude and Cursor)
  - `api-routes.md` — API route conventions
  - `auth.md` — Authentication & authorization patterns
  - `database.md` — Drizzle ORM and database conventions
  - `accessibility.md` — WCAG 2.1 AA requirements
  - `docs.md` — Documentation maintenance guidelines
- `docs/commands/` — Agent command templates
  - `review.md` — Code review checklist
  - `deploy-check.md` — Pre-deployment verification
  - `test-and-fix.md` — Targeted test + fix workflow

## Conventions & Utilities

| Utility               | Import                                                             | Notes                                                       |
| --------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| Logger                | `logger` from `@/lib/logger`                                       | Use instead of `console.log` (dev-only log/warn/info/error) |
| Class names           | `cn()` from `@/lib/utils`                                          | Always use for conditional/merged Tailwind class names      |
| Toasts                | `toast` from `sonner`                                              | User feedback (success/error)                               |
| API response helpers  | `ok`, `invalidRequest`, etc. from `@/lib/api-response`             | Keep response envelopes/status mapping consistent           |
| Authorization helpers | `requireUser`, `canX(...)` from `@/lib/authz`                      | Avoid raw role checks inside routes                         |
| Tenant helpers        | `tenantCondition`, `resolveTenantId` from `@/lib/tenant`           | Enforce read/write tenant isolation                         |
| Validation helpers    | `requireValidBody` / `requireValidQuery` from `@/lib/validation/*` | Standardized request validation flow                        |
| DB client             | `db` from `@/lib/db`                                               | Drizzle ORM client with full schema                         |
| Schema                | `* from @/lib/schema`                                              | All table definitions (institutions, users, species, etc.)  |
| Auth                  | `auth` from `@/auth`                                               | NextAuth session helper                                     |

## Workflow Rules

### Before Implementing

- Read relevant code and get full context before making changes
- Ask clarifying questions when requirements are unclear — do not assume intent
- Check accessibility implications for all UI changes (WCAG 2.1 AA required)

### During Implementation

- Leverage subagents to parallelize work when possible
- Do not run `pnpm build` for minor changes — the user runs builds manually after reviewing
- Follow the conventions and utilities documented above
- All public-facing interfaces must include proper ARIA attributes and keyboard navigation

### After Implementation

- Update documentation affected by the change (see `docs/rules/docs.md` for the full mapping)
- Key triggers: new/removed files → update Project Structure; new API routes → update endpoints; new tables → update Database Tables list; new utilities → update Conventions table

### Code Reviews

- Be comprehensive: check code quality, logic, security, accessibility, and test coverage
- Accessibility is a first-class concern — validate ARIA, color contrast, keyboard nav, screen reader support
- Tests should cover logic (not UI rendering)
- Leverage subagents to review different aspects in parallel
