This project is a multi‑tenant, WCAG‑compliant Next.js 16 (App Router) application written in **TypeScript**. Before jumping into code, ensure you’ve read the canonical context in [AGENTS.md](../AGENTS.md); it contains the technology stack, data model, and workflow rules that both humans and AI agents should follow.

### Quick links

- Architecture & big‑picture overview 👉 [docs/overview.md](../docs/overview.md)
- API conventions 👉 [docs/rules/api-routes.md](../docs/rules/api-routes.md)
- Auth/permissions rules 👉 [docs/rules/auth.md](../docs/rules/auth.md)
- Database/Drizzle patterns 👉 [docs/rules/database.md](../docs/rules/database.md)
- Accessibility requirements 👉 [docs/rules/accessibility.md](../docs/rules/accessibility.md)
- Documentation guidelines 👉 [docs/rules/docs.md](../docs/rules/docs.md)

### Why this repo is structured this way

- **Multi‑tenant routing** is central: all institution‑scoped UI lives under `src/app/[institution]/(admin|public)/…`. Dynamic segment enforces tenant isolation.
- **Route groups** `(admin)` vs `(public)` separate protected administrative pages from public galleries/stats. Middleware (`src/middleware.ts`) enforces role‑based access using JWT tokens and permission maps.
- **Drizzle ORM + PostgreSQL** runs in Docker Compose. Schema definitions live in `src/lib/schema.ts` and migrations under `drizzle/`.
- **Shadcn/UI primitives** (55+ components) in `src/components/ui/` are the building blocks; feature‑specific components live in `admin/`, `auth/`, or `public/` subfolders.
- **Forms** always use React Hook Form + Zod for validation; look at `src/app/…` pages for examples.

### Common workflows & commands

```bash
pnpm dev            # start development server
pnpm build          # production build
pnpm start          # run production server
pnpm lint           # ESLint checks
pnpm test           # Jest unit tests (logic only)
pnpm format         # Prettier formatting
pnpm format:check   # ensure formatting is correct
pnpm db:generate    # create Drizzle migration
pnpm db:migrate     # apply migrations
pnpm db:push        # sync schema to DB
pnpm db:studio      # open Drizzle Studio GUI
```

Expect tests to focus on business logic (see `src/__test__/` examples) rather than rendering.

### Project‑specific conventions

- Path alias `@/` → `/src/` for imports.
- `use client` directive marks top‑level components requiring browser APIs.
- Toasts via `sonner` (`toast.success/error(...)`), logger via `@/lib/logger`.
- Helper `cn()` for Tailwind class merging (`@/lib/utils`).
- JWT session contains `role` and `institutionId`; permission checking via `@/lib/permissions.ts`.
- Conventional commits enforced by `commitlint.config.ts`.

### Integration points & dependencies

- **NextAuth 5** with credentials provider – authentication logic chiefly in `src/auth.ts` and API route under `src/app/api/auth/[...nextauth]/route.ts`.
- **Database**: `db` client imported from `@/lib/db`, schema exported from `@/lib/schema`.
- **Middleware** secures tenant routes and maps URL sections to permission keys.
- **External services**: none beyond the local PostgreSQL database; everything runs in Docker during development.

When generating or modifying code, reference examples in existing files and mirror patterns (e.g. `src/app/[institution]/(admin)/shipments/page.tsx` for a new admin page). After changes, update `AGENTS.md` or relevant docs if structure or tables change.

Feel free to iterate on these instructions—let me know if anything is unclear or missing! 🛠️
