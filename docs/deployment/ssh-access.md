# SSH Access

Reaching the production server from your local CLI.

Production runs `docker-compose.prod.yml` — PostgreSQL 17 only. The Next.js app is
not containerized there.

## One-time setup

Add an alias to `~/.ssh/config` **on your own machine** — this file is read by your
local `ssh` client and is never sent to the server:

```
Host flutr-prod
  HostName <server-ip>
  User <user>
  IdentityFile ~/.ssh/<key-name>
  IdentitiesOnly yes
```

Your public key must already be in `~/.ssh/authorized_keys` on the server; that side
is granted by whoever administers the droplet.

Verify:

```bash
ssh flutr-prod hostname
```

## Getting a shell

```bash
ssh flutr-prod
```

That is the whole command — no flags. It opens an interactive prompt on the server;
`exit` closes it. Use this for inspecting containers, reading logs, or running
`psql` on the box:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail 50 db
docker compose -f docker-compose.prod.yml exec db psql -U postgres flutr-db
```

A shell and a tunnel are different tools. The shell puts you _on_ the server. The
tunnel below puts the server's database _on your machine_, at `localhost:5433`, so
local commands like `pnpm db:migrate` and `pg_dump` can reach it — it does not log
you in and gives no prompt.

## Port forwarding

Postgres should not be reachable from the public internet. Tunnel to it instead of
connecting directly:

```bash
ssh -fN -o ExitOnForwardFailure=yes -L 5433:localhost:5432 flutr-prod
```

Production is mapped to local port **5433**, not 5432, because `docker-compose.yml`
binds 5432 to your local dev database. Do not reuse 5432 for the tunnel even though
it appears to work: on Windows a tunnel on `127.0.0.1:5432` and docker on
`0.0.0.0:5432` bind simultaneously, and the loopback listener silently wins for
`localhost` connections — so `localhost:5432` would reach production while every
local tool still assumes it is dev. Separate ports keep the two unambiguous.

`ExitOnForwardFailure=yes` makes a failed bind kill the connection rather than leave
an idle session that looks like it worked. It is not a full guard on Windows, which
permits a second tunnel to bind an already-bound port — check for an existing
listener before starting another one.

`-N` runs no remote command, so it never gives you a shell. For a shell on the
server, use plain `ssh flutr-prod`.

On Windows, `-f` cannot detach the process (no `fork()`), so the command holds its
terminal while the forward is live — that is working, not hung. Run it in its own
window, or append `&` in Git Bash.

Close it when done:

```bash
# Linux/macOS
pkill -f "L 5433:localhost:5432"
# Windows PowerShell
Get-Process ssh | Stop-Process
```

## Troubleshooting

**`Permission denied (publickey)`** — `ssh` never offered your key. It only tries
default names (`id_ed25519`, `id_rsa`) plus whatever an agent holds, so a key under
any other name needs the `IdentityFile` line above or an explicit
`ssh -i ~/.ssh/<key-name>`. Confirm what was offered with `ssh -v`.

**`Could not resolve hostname flutr-prod`** — the config file wasn't read, so the
alias was treated as a literal DNS name. Usually the file is in the wrong place or
has the wrong name; Notepad in particular saves `config.txt` unless you set "Save as
type" to All Files. It must be exactly `~/.ssh/config`.

**Hangs with no output** — usually not a hang. `-N` runs no remote command and on
Windows `-f` cannot detach, so a live tunnel looks exactly like a frozen one. Check
for the listener before assuming failure:

```bash
netstat -ano | grep LISTEN | grep :5433
```

A PID there means the forward is up; leave the window alone. Nothing there means the
bind failed, which `ExitOnForwardFailure=yes` will also surface as an immediate exit.

**Windows note** — Git Bash and Windows OpenSSH both read `C:\Users\<you>\.ssh\config`,
so one file serves both. Write it with `printf` or a heredoc rather than a GUI
editor to avoid CRLF line endings riding along on the ends of values.
