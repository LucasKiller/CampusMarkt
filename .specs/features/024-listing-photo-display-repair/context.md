# Listing Photo Display Repair — Context

The operator reports that the public Create Listing form does not show a photo preview. Feature 021 fixed signed upload locally, but production has not received it. Code inspection found a separate display defect: persisted `storagePath` values are rendered as site root URLs, and owner screens use a nonexistent `/api/listings/media/preview` route. The public `listing-media` bucket is exposed through the site's `/storage/v1/*` proxy.

No new database or Storage policy is needed. Production deployment remains separately authorized under AGENTS.md.

Live read-only diagnosis on 2026-10-04: Coolify runs production commit `6e3162a`, which includes the earlier upload repair. An existing public listing card requests its saved photo from `/<owner>/<file>.jpg` and receives HTTP 404. The same object at `/storage/v1/object/public/listing-media/<owner>/<file>.jpg` responds HTTP 200 with `image/jpeg`. This confirms the display URL defect against a real stored photo without modifying production data.
