# Deployments

The frontend deploys to Vercel on push. The database is PostgreSQL 17 in Docker on a
DigitalOcean droplet (`docker-compose.prod.yml`), which Vercel connects to directly.
Schema changes reach it through Drizzle migrations.

## Writing a migration

Migrations are generated, never hand-written.

1. Edit `src/lib/schema.ts`.
2. Run `pnpm db:generate`.

`drizzle-kit` diffs your schema against the most recent snapshot in
`drizzle/meta/` and writes three things:

| File                              | Purpose                                                           |
| --------------------------------- | ----------------------------------------------------------------- |
| `drizzle/000N_<name>.sql`         | the SQL to run                                                    |
| `drizzle/meta/000N_snapshot.json` | schema state after this migration, the baseline for the next diff |
| `drizzle/meta/_journal.json`      | one appended entry: `idx`, `tag`, `when`                          |

The name is a random codename unless you pass one: `pnpm db:generate --name=add_release_notes`.

Read the generated SQL before committing — confirm it does what you intended and
nothing more. All three files are committed together; the `.sql` is the reviewable
artifact, not the schema diff.

## How Drizzle decides what to run

A ledger, not a diff. The repo holds the manifest; the database holds a watermark.

`drizzle/meta/_journal.json` lists every migration in order with a creation
timestamp:

```json
{ "idx": 5, "when": 1777043238117, "tag": "0005_pale_chimera", "breakpoints": true }
```

The database holds `drizzle.__drizzle_migrations` (`id`, `hash`, `created_at`),
created on first run, where `created_at` is that same `when` value.

`drizzle-kit migrate` then:

1. Reads the journal from the checked-out repo.
2. Queries the newest `created_at` in `__drizzle_migrations`.
3. Applies every journal entry with a greater `when`, in order.
4. Inserts a row per applied file.

Re-running is therefore a no-op — safe to retry a failed job.

`breakpoints: true` means the SQL is split at `--> statement-breakpoint` markers and
executed one statement at a time, which is why a migration can fail partway through
with earlier statements already committed.

### Concurrent migrations will bite you

Step 2 compares against **one watermark**, not each file individually. Timestamps
come from when `db:generate` ran locally, not from merge order:

- You branch Monday, generate `0006`, timestamp Monday.
- A teammate branches Tuesday, generates `0006`, merges Wednesday.
- You merge Thursday. Conflict resolution renames yours `0007`, but its `when` is
  still Monday — older than the watermark their migration just set.

Your migration is silently skipped. No error, CI green, schema quietly wrong.

`drizzle-kit check` (run in CI) catches colliding `idx` values. It does **not** catch
out-of-order timestamps. If two people generate migrations concurrently, rebase and
regenerate — never hand-edit the journal.

## Automated path

`.github/workflows/ci.yml` has a `migrate` job that applies pending migrations on
merge to `main`. It runs only on pushes to `main`, only after lint/test/build pass,
and under the `production` GitHub environment.

The job does **not** take a backup first — see [`backups.md`](./backups.md), which
currently records that no backups exist at all. Until that is fixed, keep required
reviewers on the `production` environment and use the manual path for anything
destructive.

Requires two pieces of GitHub configuration:

- Secret `PRODUCTION_DATABASE_URL` — the production connection string.
- Environment `production` — add required reviewers to gate each run behind manual
  approval.

### Migrations must be backwards-compatible

Vercel begins building the moment you push, so the migrate job and the new code land
at roughly the same time. For a window of a minute or two, the new schema is live
against the old code. Every migration has to tolerate that:

- **Adding**: new columns nullable or defaulted. Old code ignores them.
- **Backfilling**: a later release, once new code is writing the column.
- **Removing**: a third release, once nothing deployed references it.

Never drop or rename a column in the same release as the code change. If a migration
genuinely cannot be made compatible, disable Vercel's production auto-deploy and
sequence it by hand.

## Manual path

For destructive migrations, backfills, or anything needing a backup first. Requires
an SSH tunnel — see [`ssh-access.md`](./ssh-access.md).

```bash
ssh -fN -o ExitOnForwardFailure=yes -L 5433:localhost:5432 flutr-prod
```

Confirm which database you are attached to before anything destructive:

```bash
psql "postgresql://<user>:<password>@localhost:5433/flutr-db" -c "select inet_server_addr(), current_database();"
```

Back up. No exceptions — a bad `DROP COLUMN` is not recoverable otherwise:

```bash
pg_dump "postgresql://<user>:<password>@localhost:5433/flutr-db" -Fc -f prod-$(date +%Y%m%d-%H%M).dump
```

Apply:

```bash
# PowerShell
$env:DATABASE_URL="postgresql://<user>:<password>@localhost:5433/flutr-db"
pnpm db:migrate

# bash/zsh
DATABASE_URL="postgresql://<user>:<password>@localhost:5433/flutr-db" pnpm db:migrate
```

Set `DATABASE_URL` per command rather than editing `.env` — an edited `.env` is a
loaded gun the next time you run any `db:` script.

Verify, then close the tunnel:

```bash
ssh flutr-prod
docker compose -f docker-compose.prod.yml exec db psql -U postgres flutr-db -c '\d <changed-table>'
```

Restore path, should you need it:

```bash
pg_restore -d "postgresql://<user>:<password>@localhost:5433/flutr-db" --clean prod-<timestamp>.dump
```

## Never run against production

- `pnpm db:push` — diffs and applies with no migration file and no journal entry. It
  will silently drop columns to make the database match the schema. Local
  prototyping only.
- `pnpm db:studio` — fine for browsing, but it is a live editor on production data.

## If a migration fails midway

Statements run individually, so a failure can leave the schema half-applied.

1. Read the error — it names the failing statement.
2. Inspect the real state (`\d <table>`) rather than assuming.
3. Either finish by hand with `psql`, or restore the backup.
4. Fix the migration file, then re-run. Already-applied migrations are skipped.

Statements needing atomicity should be wrapped in `BEGIN; ... COMMIT;` inside the
migration file itself.
