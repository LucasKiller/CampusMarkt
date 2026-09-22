# Listing Creation and Management Context

**Gathered:** 2026-09-22
**Spec:** `.specs/features/004-listing-creation-management/spec.md`
**Status:** Ready for design

---

## Executive Summary

Feature `004-listing-creation-management` enables authenticated CampusMarkt users to create, edit, manage, and transition physical goods listings (`SELL`, `GIVE_AWAY`, `WANTED`) with ordered photos across 7 canonical categories and 10 coarse pickup areas in Braunschweig.

---

## Discussed Areas & Decisions

### 1. Creation Workflow & Lifecycle States

- **Direct Publish to `ACTIVE`**:
  - The listing creation form publishes directly to `ACTIVE` state upon successful submission.
  - *Rationale*: Keeps the state machine lean for MVP while allowing owners to immediately view, edit, or archive their listing.
- **Owner Lifecycle Transitions**:
  - Owners can transition their listings between `ACTIVE` and `RESERVED` (for coordinating pickup agreements), mark as `SOLD` (or transferred/found), and `ARCHIVED` (soft-delete).
  - *Rationale*: Provides essential coordination controls prior to automated negotiation and transaction features. Soft archival retains data integrity without orphaned relational references.

### 2. Media Upload & Constraints

- **Conditional Mandatory Images**:
  - `SELL` and `GIVE_AWAY` listings require at least 1 image (up to 8).
  - `WANTED` listings allow 0 to 8 images (images optional).
  - *Rationale*: Physical items offered for transfer require visual condition proof to protect buyers and avoid low-effort spam. Seekers of wanted items frequently do not own the item to photograph.
- **Storage & Ordering**:
  - Images are constrained to max 5MB each in JPEG, PNG, or WebP format, stored in Supabase Storage (`listing-media`) with owner RLS policies.
  - The first image (index 0) serves as the primary cover photo, and users can reorder or remove images during creation and editing.

### 3. Categories & Pickup Zones

- **7 Canonical Categories**:
  - `furniture`, `electronics`, `books_studies`, `bicycles_mobility`, `clothing`, `home_kitchen`, `other`.
  - *Rationale*: Tailored to student life and Braunschweig households, strictly limited to physical goods, preventing unsupported verticals (services, jobs, housing, digital goods).
- **10 Coarse Pickup Areas in Braunschweig**:
  - `Innenstadt`, `Campus / TU-Altgebäude`, `Campus Nord / Bienrode`, `Östliches Ringgebiet`, `Westliches Ringgebiet`, `Nördliches Ringgebiet / Siegfriedviertel`, `Viewegs Garten / Bebelhof`, `Heidberg / Melverode`, `Weststadt`, `Lehndorf / Kanzlerfeld`.
  - *Rationale*: Preserves user privacy by avoiding exact addresses while giving sufficient neighborhood granularity for local in-person pickup planning.

### 4. Editing Boundaries & Field Validation

- **Content Mutable, Intent Immutable**:
  - Owners can update title, description, price, condition, category, pickup area, and images.
  - `listing_type` (`SELL`, `GIVE_AWAY`, `WANTED`) is immutable once published.
  - *Rationale*: Prevents confusing bait-and-switch shifts (e.g. converting a free giveaway into a paid listing after interest is shown).
- **Price & Content Bounds**:
  - Title: 5 to 100 characters.
  - Description: 10 to 2000 characters.
  - Conditions: `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`.
  - Price: For `SELL`, required integer cents (€0.50 to €10,000.00); for `GIVE_AWAY`, strictly €0.00/null; for `WANTED`, optional maximum budget.
  - Prohibited goods guidance displayed inline on creation form.
