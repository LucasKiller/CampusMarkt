# Listing Photo Display Repair — Context

The operator reports that the public Create Listing form does not show a photo preview. Feature 021 fixed signed upload locally, but production has not received it. Code inspection found a separate display defect: persisted `storagePath` values are rendered as site root URLs, and owner screens use a nonexistent `/api/listings/media/preview` route. The public `listing-media` bucket is exposed through the site's `/storage/v1/*` proxy.

No new database or Storage policy is needed. Production deployment remains separately authorized under AGENTS.md.
