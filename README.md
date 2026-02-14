# Flutr

A WCAG-compliant, multi-tenant web application for butterfly houses to track shipments, quality metrics, and historical records while delivering public-facing galleries and statistics.

## Prerequisites

### Node.js >= 22.18.0

Install via [nvm](https://github.com/nvm-sh/nvm) (recommended) or [download directly](https://nodejs.org/):

```bash
# Using nvm (reads .nvmrc automatically)
nvm install
nvm use

# Verify
node -v
```

### pnpm >= 10.29.3

```bash
# Install via corepack (bundled with Node.js)
corepack enable
corepack prepare pnpm@10.29.3 --activate

# Or install standalone
npm install -g pnpm@10.29.3

# Verify
pnpm -v
```

### Docker

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for your OS, then verify:

```bash
docker -v
docker compose version
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env and set NEXTAUTH_SECRET (generate one with: openssl rand -base64 32)

# Start PostgreSQL
docker compose up -d

# Push database schema
pnpm db:push

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

| Variable          | Description                  | Default                                                  |
| ----------------- | ---------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/flutr-db` |
| `NEXTAUTH_SECRET` | NextAuth encryption secret   | _(required, generate your own)_                          |
| `NEXTAUTH_URL`    | Application base URL         | `http://localhost:3000`                                  |

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
pnpm db:push        # Push schema directly to database
pnpm db:studio      # Open Drizzle Studio GUI
```

## Tech Stack

| Technology      | Purpose                             |
| --------------- | ----------------------------------- |
| Next.js 16      | Framework (App Router)              |
| TypeScript      | Language                            |
| pnpm            | Package manager                     |
| Tailwind CSS 4  | Styling                             |
| Shadcn/UI       | Accessible UI component library     |
| React Hook Form | Form management with Zod validation |
| Recharts        | Charts and statistics               |
| NextAuth 5      | Authentication (credentials, JWT)   |
| PostgreSQL 17   | Database (via Docker)               |
| Drizzle ORM     | Type-safe database queries          |
| Jest            | Testing                             |

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by [commitlint](https://commitlint.js.org/). A `commit-msg` hook validates every commit message automatically.

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only changes                              |
| `style`    | Formatting, missing semicolons, etc.                    |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or updating tests                                |
| `build`    | Changes to build system or dependencies                 |
| `ci`       | CI/CD configuration changes                             |
| `chore`    | Other changes that don't modify src or tests            |

### Examples

```bash
git commit -m "feat(shipments): add shipment creation form"
git commit -m "fix(auth): handle expired JWT refresh"
git commit -m "docs: update README prerequisites"
```

## Documentation

See [`AGENTS.md`](AGENTS.md) for full project context, conventions, and workflow rules used by both contributors and AI agents (Claude, Cursor).

Detailed docs live in `docs/`:

| Document                                  | Description                           |
| ----------------------------------------- | ------------------------------------- |
| [Architecture Overview](docs/overview.md) | App structure, auth, data model       |
| [Rules](docs/rules/)                      | Development conventions and standards |
| [Commands](docs/commands/)                | Reusable workflow templates           |
