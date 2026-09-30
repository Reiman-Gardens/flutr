# Backups

## Current state

Nightly `pg_dump` via root's crontab on the droplet, installed and verified
2026-09-30:

- Runs at 03:00 **UTC** — the droplet's timezone is `Etc/UTC`, not yours.
- Writes `/root/backups/flutr-<date>.dump` (custom format, `-Fc`).
- Prunes dumps older than 14 days.
- First dump verified: 134 KB, 12 `TABLE DATA` entries via `pg_restore -l`.

Gaps that remain: dumps live only on the droplet, and no restore has been performed
end to end. DigitalOcean Droplet Backups are configured in the control panel, not on
the box, and have not been confirmed either way.

The `migrate` CI job does not take its own backup — it relies on this nightly dump,
so a migration merged during the day can be up to 24 hours ahead of the last one.
Take an on-demand backup before anything destructive.

## Droplet backups are not database backups

DigitalOcean's weekly Droplet Backups and manual Snapshots image the whole disk.
They restore the machine to a weekly boundary, and a Postgres data directory copied
from a running container is not guaranteed to be consistent. They are disaster
recovery for losing the droplet — not an undo for a bad migration.

A `pg_dump` is what covers the migration case.

## Scheduled dumps

A crontab entry on the droplet, nightly at 03:00 with 14-day retention. This is a
line for the crontab file, not a command to run at a shell prompt — the leading
`0 3 * * *` is the schedule, and a shell will try to execute `0` as a program.
Install it with `ssh -t flutr-prod 'crontab -e'` (the `-t` gives the editor a TTY):

```bash
0 3 * * * docker exec $(docker ps -qf name=db) pg_dump -U postgres -Fc flutr-db > /root/backups/flutr-$(date +\%F).dump && find /root/backups -name "*.dump" -mtime +14 -delete
```

`mkdir -p /root/backups` first. Percent signs must stay escaped — cron treats a bare
`%` as a newline.

To run the same backup once, by hand, drop the schedule prefix and unescape the `%`:

```bash
ssh flutr-prod 'mkdir -p /root/backups && docker exec $(docker ps -qf name=db) pg_dump -U postgres -Fc flutr-db > /root/backups/flutr-$(date +%F).dump'
```

Verify the morning after installing it. A backup that has never been restored is not
a backup:

```bash
ssh flutr-prod 'ls -lh /root/backups'
```

A zero-byte dump means the `docker ps -qf name=db` lookup missed the container —
check the name with `docker ps --format '{{.Names}}'` and hardcode it if needed.

### Dumps on the same droplet do not survive losing the droplet

Ship them off-box — object storage via `rclone`, or `scp` to another host. Until
that exists, the backups only protect against bad SQL, not against the machine
going away.

## On-demand backup

Before any destructive migration, over the SSH tunnel from
[`ssh-access.md`](./ssh-access.md):

```bash
pg_dump "postgresql://<user>:<password>@localhost:5433/flutr-db" -Fc -f prod-$(date +%Y%m%d-%H%M).dump
```

Your local `pg_dump` must be version 17 or newer — it refuses to dump a server
newer than itself.

## Restore

```bash
pg_restore -d "postgresql://<user>:<password>@localhost:5433/flutr-db" --clean prod-<timestamp>.dump
```

`--clean` drops existing objects before recreating them. Restoring to a scratch
database first and diffing is the safer habit when the dump's contents are in doubt.

For a dump sitting on the droplet:

```bash
ssh flutr-prod 'docker exec -i $(docker ps -qf name=db) pg_restore -U postgres -d flutr-db --clean' < flutr-<date>.dump
```

## Not doing this in CI

Adding `pg_dump` to the `migrate` workflow was considered and rejected:

- The dump would land in a GitHub artifact — the full production dataset, including
  user records and password hashes, in CI storage.
- `ubuntu-latest` ships the PostgreSQL 16 client, which refuses to dump a 17 server.
  It would need an apt pin for the v17 client.
- It only covers deploys. Most data loss is a bad manual `UPDATE`, not a migration.

A cron on the droplet covers all three cases for less work.

## Open items

- [x] Install the nightly cron
- [ ] Confirm whether DigitalOcean Droplet Backups are enabled
- [ ] Ship dumps off-box
- [ ] Perform one full restore into a scratch database to prove the dumps work
