# Listing Photo Display Repair

**Status:** Implemented locally; independent validation pending.

## Problem Statement

Successful uploads leave a Storage path in the listing records, but most image renderers request that path directly from the web root. Two owner screens request a preview API route that does not exist. Photos therefore disappear after publication even if the upload succeeds.

## Goals

Show stored listing photos in every existing listing surface after a successful upload, while preserving the existing optional-photo placeholder for WANTED listings.

## Out of Scope

| Item | Reason |
| --- | --- |
| Upload transport | Feature 021 already repairs and tests it locally. |
| Production deployment | AGENTS.md requires separate authorization. |
| Private image bucket or new endpoint | The existing public bucket and proxy serve images. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Storage access | `/storage/v1/object/public/listing-media/` on the site origin | Matches the bucket migration, Caddy proxy, and Supabase public bucket URL contract. | Yes |
| Stored path contract | Keep paths in APIs and database | Existing RPCs return paths and owner mutation APIs accept paths. | Yes |

**Open questions:** none for the local display repair.

## User Stories

### MEDIA-01: Resolve stored photos

As a visitor, I want photos on listings to load from the site's image storage.

1. WHEN a listing has a stored `listing-media` path THEN the site SHALL render its image from the public Storage route on the same site origin.
2. WHEN a stored path has URL-sensitive characters THEN each path segment SHALL be encoded without losing folder separators.
3. WHEN a listing has no photo THEN the existing placeholder SHALL remain.

### MEDIA-02: Show photos across existing views

As a visitor or owner, I want the same saved photo to appear throughout the listing flow.

1. WHEN a stored listing is shown in discovery cards, the home showcase, favorites, or the detail gallery THEN its photo SHALL use the resolved public Storage URL.
2. WHEN a stored listing is shown in the owner's listings, management editor, or conversation listing summary THEN its photo SHALL use the same resolved URL.
3. WHEN the owner opens a newly created listing in management THEN existing uploaded photos SHALL appear instead of requesting a nonexistent preview endpoint.

## Requirement Traceability

| Requirement | Evidence | Status |
| --- | --- | --- |
| MEDIA-01 | URL resolver and component tests | Verified locally |
| MEDIA-02 | Rendered view and browser journey tests | Verified locally |
