# Listing Photo Upload Repair Context

**Source:** Operator reported that no photo could be uploaded or dragged into the new-listing form on 2026-10-04.

The existing feature 004 requires one to eight photos for `SELL` and `GIVE_AWAY`, optional photos for `WANTED`, JPEG/PNG/WebP up to 5 MB, and direct signed upload to the `listing-media` bucket. `DESIGN.md` requires clear media previews and recoverable errors.

The web server reaches Supabase at `http://api-gw:8000`. Storage SDK signed URLs inherit that internal origin. Caddy routes public `/storage/v1/*` requests to the same gateway, so the intent route can return the identical signed path and query on the site's origin. The current form neither handles `drop` nor rejects an unsuccessful Storage response.
