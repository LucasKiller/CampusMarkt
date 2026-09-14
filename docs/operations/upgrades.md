# Pinned Supabase upgrades

CampusMarkt is pinned by `infra/supabase/.supabase-version`; never update individual service images opportunistically. Supabase publishes compatible self-hosted snapshots, and breaking changes can require configuration or PostgreSQL migration steps.

Before choosing a target, read every entry between the installed and target releases in the [official self-hosted changelog](https://github.com/supabase/supabase/blob/master/docker/CHANGELOG.md) and the [official update guide](https://supabase.com/docs/guides/self-hosting/updating). In particular, PostgreSQL 17 and the Envoy gateway were breaking transitions in earlier releases. The vendored `update.sh` backs up configuration files only; it does not back up PostgreSQL or Storage data.

## Gated sequence

1. Record the active Git revision and pinned Supabase release. Read the changelog, release notes, required manual migrations, and rollback notes.
2. On a clean branch, preview the chosen pinned target. Replace `vX.Y.Z` with an actual self-hosted release from the changelog; never target an unreviewed moving branch.

```console
$ sh infra/supabase/update.sh --dry-run --to self-hosted/vX.Y.Z
```

3. Resolve the dry-run plan before proceeding. Run the repository gate and create a complete off-host backup. Do not proceed unless a recent isolated restore drill is green.

```console
$ npm run verify
$ npm run backup -- --destination /mnt/off-host/campusmarkt --project-name campusmarkt
```

4. Apply the reviewed target on the branch, inspect all merge conflicts and new environment variables, then validate the merged Compose model. A PostgreSQL major-version change must follow the version-specific Supabase guide; never point a new major image at an old data directory.

```console
$ sh infra/supabase/update.sh --to self-hosted/vX.Y.Z
$ docker compose config --quiet
```

5. After review and explicit deployment authorization, pull the pinned images and recreate the stack. The root migration gate must finish before web readiness succeeds.

```console
$ docker compose pull
$ docker compose up --detach --wait
```

6. Run the public HTTPS smoke checks and inspect every service health state. If any check fails, stop the rollout, preserve diagnostics, and follow the reviewed rollback plan.

```console
$ curl --fail --show-error https://campusmarkt.example/health/live
$ curl --fail --show-error https://campusmarkt.example/health/ready
$ curl --fail --show-error https://campusmarkt.example/
```

7. Prove restore readiness again on a separate disposable host using the new pinned stack and the pre-update manifest.

```console
$ npm run restore -- --source /mnt/off-host/campusmarkt/backup-TIMESTAMP/manifest.json --target isolated --project-name campusmarkt-restore-drill
```

Only after health, smoke, migration, and restore evidence is recorded should the new `.supabase-version` and release be accepted. Rollback uses the documented compatible target and a verified isolated restore, never an unreviewed in-place overwrite.
