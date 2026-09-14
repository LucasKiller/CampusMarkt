# Backup and isolated restore

CampusMarkt creates a PostgreSQL custom-format dump, a Storage archive, and a versioned JSON manifest containing SHA-256 digests. The destination must be a host path outside the primary database and Storage volumes. In production, that path must leave the primary VPS through mounted or replicated off-host storage.

## Create a backup

With the source stack healthy and its root `.env` available, choose the Compose project name actually used by the source. The command prints the completed `manifest.json` path only after both artifacts and their checksums exist; database, Storage, or destination failure exits non-zero without a success manifest.

```console
$ npm run backup -- --destination /mnt/off-host/campusmarkt --project-name campusmarkt
```

Retain the entire timestamped directory. Moving only `manifest.json`, `database.dump`, or `storage.tar` breaks the recovery unit. Copy the completed directory off-host and verify the backup job's non-zero exit handling in monitoring.

## Restore drill

Never restore into the active environment. Use a separate disposable host or VM whose root `.env` contains test-only values; the upstream Supabase files use fixed container names, so an isolated project must not share a Docker daemon with the active stack. Start only the dependencies needed for the drill, then pass the explicit `isolated` guard and a distinct project name.

```console
$ docker compose --project-name campusmarkt-restore-drill up --detach --wait storage
$ npm run restore -- --source /mnt/off-host/campusmarkt/backup-TIMESTAMP/manifest.json --target isolated --project-name campusmarkt-restore-drill
```

The restore first verifies both SHA-256 entries, creates the separate `campusmarkt_restore` database, restores the dump, and extracts Storage objects. Query the expected business fixtures in `campusmarkt_restore` and retrieve their referenced Storage objects before declaring the drill successful. The automated operations gate performs this row-and-object round-trip with a canary fixture.

```console
$ npm run test:operations
```

After recording the evidence, remove the disposable drill. This command deletes the drill's volumes and must never target the active project.

```console
$ docker compose --project-name campusmarkt-restore-drill down --volumes --remove-orphans
```

Treat checksum rejection, a missing object, a missing row, or any partial operation as a failed recovery. Keep the failed artifacts and bounded diagnostics for investigation; do not relabel them as a successful backup.
