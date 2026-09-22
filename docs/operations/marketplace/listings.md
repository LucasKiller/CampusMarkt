# Marketplace Listings Operations Runbook

This runbook defines operational guidance, boundaries, media management, and incident recovery procedures for Feature 004: Listing Creation and Management.

> [!IMPORTANT]
> This documentation defines an operational contract; it does not authorize destructive operations or schema modifications without separate, explicit authorization.

---

## Architecture and System Boundaries

Feature 004 introduces local-first physical goods listing capabilities for CampusMarkt in Braunschweig:
- **Listing Types**: `SELL` (requires positive price €0.01 - €9,999.99), `GIVE_AWAY` (fixed price €0.00), and `WANTED` (fixed price €0.00).
- **Status Lifecycle**: Owner-driven transitions among `active`, `reserved`, `sold`, and `archived`.
- **Media Upload**: Client uploads directly to Supabase Storage `marketplace-listings` bucket via signed upload intents, constrained to 1-8 photos, max 5MB each, JPEG/PNG/WebP format.
- **Abuse Prevention**: Rate-limited to 20 creations per hour per authenticated user account.
- **Audit Logging**: All state-modifying actions (creation, field updates, status transitions) record structured audit logs with correlation IDs.

---

## Preflight and Configuration Validation

Before promoting a marketplace listings release in production, operators must verify the following:

1. **Storage Bucket Configuration**:
   - Bucket `marketplace-listings` must exist with `public: false` (or private with public read via signed URLs/public CDN policy).
   - Max file size limit: 5MB (5,242,880 bytes).
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.

2. **Schema and RLS Enforcement**:
   - Tables `marketplace.listings` and `marketplace.listing_media` must have Row Level Security enabled.
   - Public read access is granted only for `active` listings belonging to non-deleted users.
   - Write access is strictly restricted to the listing owner (`created_by = auth.uid()`).
   - Moderation / administration queries bypass RLS solely via the service role key at the server boundary.

3. **Rate Limiting**:
   - Hourly limit: 20 creations per user account per rolling 60-minute window.
   - In-memory rate-limiter entries expire automatically.

---

## Media Storage Management and Hygiene

### Orphaned Upload Cleanup
When users request an upload intent (`/api/listings/media/upload-intent`) but abandon the form before final listing submission:
- Upload intents create storage objects with structured paths: `listings/{listing_id}/{media_id}.{ext}`.
- Storage objects not referenced by any record in `marketplace.listing_media` older than 24 hours should be identified and pruned by background maintenance routines.

### Content Deletion
When a listing is deleted or media photos are removed by the owner:
- Soft deletion removes or archives the listing and disassociates media metadata.
- Storage objects are deleted asynchronously via the storage API adapter to prevent dangling object references.

---

## Incident Response & Recovery

### 1. Storage / Image Upload Failures
- **Symptom**: HTTP 500 or network failure during photo upload; `/api/listings/media/upload-intent` returns `STORAGE_ERROR`.
- **Impact**: Users cannot upload new photos; text-only listing creation may succeed if photos are optional or user is blocked from submitting if images are required.
- **Action**: Check Supabase Storage service health and bucket quota. Ensure storage bucket policy allows authenticated users to insert objects into `marketplace-listings/{listing_id}/*`.

### 2. Rate-Limiting Triggers (Spam Storm)
- **Symptom**: Legitimate or malicious users receive HTTP 429 `TOO_MANY_REQUESTS` ("Listing creation limit reached (maximum 20 listings per hour).").
- **Impact**: Specific accounts are temporarily throttled from posting additional listings.
- **Action**: Verify audit logs for the affected account ID. If malicious, flag or suspend the account. If a legitimate user encountered a burst, the window resets after 60 minutes.

### 3. Prohibited Goods & Policy Takedowns
- **Symptom**: A listing violates marketplace policy (weapons, illegal substances, digital currency, services, or commercial spam).
- **Impact**: Listing must be immediately depublished from public marketplace browse/search.
- **Action**:
  1. Set status to `archived` with a moderation audit note.
  2. The listing immediately vanishes from public browse endpoints due to RLS filter `status = 'active'`.
  3. Only the owner and system administrators retain visibility into the archived record.

### 4. Status Desynchronization
- **Symptom**: Listing shows contradictory status or cannot transition due to client state mismatch.
- **Impact**: Owner receives `400 BAD_REQUEST` ("Cannot transition listing from ... to ...").
- **Action**: State machine strictly enforces valid transitions:
  - `active` -> `reserved`, `sold`, `archived`
  - `reserved` -> `active`, `sold`, `archived`
  - `sold` -> `archived`
  - `archived` is terminal.
  Instruct the user to refresh their management view to load the latest server-side state.
