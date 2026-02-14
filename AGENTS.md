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
│       ├── users/          # User management
│       └── institution/    # Institution management
├── components/             # React components by feature
│   ├── admin/              # Admin-specific components
│   ├── auth/               # Auth-specific components
│   ├── public/             # Public-facing components
│   └── ui/                 # 55+ Shadcn/UI primitives
├── hooks/                  # Custom React hooks
│   └── use-mobile.ts       # Responsive design hook
├── lib/                    # Utilities and configuration
│   ├── db.ts               # Drizzle ORM client
│   ├── schema.ts           # Database schema definitions
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

- `institutions` — Multi-tenant organizations (address, contact, IABES membership)
- `users` — User accounts with institution association and role
- `butterfly_species` — Global species catalog (scientific name, origin countries)
- `butterfly_species_institution` — Institution-specific species data (common name, description, life expectancy, image)
- `suppliers` — Butterfly suppliers/vendors (name, code, country, website)
- `shipments` — Shipment tracking with damage/mortality metrics (emerged, damaged, diseased, parasites, non-emergence, poor emergence)

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
  - `new-component.md` — Component creation conventions

## Conventions & Utilities

| Utility     | Import                       | Notes                                                       |
| ----------- | ---------------------------- | ----------------------------------------------------------- |
| Logger      | `logger` from `@/lib/logger` | Use instead of `console.log` (dev-only log/warn/info/error) |
| Class names | `cn()` from `@/lib/utils`    | Always use for conditional/merged Tailwind class names      |
| Toasts      | `toast` from `sonner`        | User feedback (success/error)                               |
| DB client   | `db` from `@/lib/db`         | Drizzle ORM client with full schema                         |
| Schema      | `* from @/lib/schema`        | All table definitions (institutions, users, species, etc.)  |
| Auth        | `auth` from `@/auth`         | NextAuth session helper                                     |

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
