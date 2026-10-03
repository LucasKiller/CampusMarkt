# Coolify Deployment Context

The operator requested `development` and `production` branches and authorized publishing only production to the existing Coolify application. Both branches currently start at `b50dec6`. Development is the GitHub default and local checkout. The operator confirmed the existing VPS resource should be production.

The operator requested an isolated self-hosted Supabase stack. Google SMTP credentials were filled directly in Coolify. Authentication and delivery to the operator-designated mailbox succeeded on 2026-10-03; see `release.md`.

The operator asked to defer external backup. This installation is for reviewing progress, with functional SMTP. The existing production-readiness gate remains unchanged; off-host backups and the recorded beta-security blockers must be resolved before beta readiness can be claimed.

The VPS reports Ubuntu 24.04.4, four CPU cores, 15.6 GB RAM, Docker 29.4.2, and Compose 5.1.3. Disk capacity and free memory remain to be inspected before starting the stack.

No credentials belong in these documents, commits, screenshots, or deployment logs.
