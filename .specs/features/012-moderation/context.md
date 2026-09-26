# Feature Context: 012-moderation

## 1. Problem Summary

In Feature 011, CampusMarkt enabled community members to report policy-violating listings, scams, harassment, and prohibited goods with 100% reporter confidentiality. However, reporting alone does not protect the marketplace unless operators have structured, privileged tooling to triage those reports, investigate context, and execute enforcement actions.

Without a dedicated moderation workflow:
- Reports pile up in the database with no triage queue or resolution tracking.
- Harmful content (weapons, drugs, counterfeit items, off-platform advance-fee scams) remains visible in public search and feeds indefinitely.
- Operators lack an auditable, least-privilege interface to take down listings or suspend abusive accounts.
- Actions taken manually in raw database tables lack non-repudiation and risk accidental data deletion or privacy violations.

Feature `012-moderation` establishes the internal trust and safety console of CampusMarkt V1, providing an auditable, least-privilege review queue for moderators to investigate reports, dismiss false complaints, take down infringing listings (`status = 'removed'`), and suspend bad-faith accounts.

---

## 2. Target Users & Pain Points

- **Community Moderators**:
  - *Pain*: Sorting through raw database tables or emails to understand what needs review, who reported it, and what policy rule was broken.
  - *Need*: A responsive, secure `/moderation` workspace showing pending reports with target previews, reported policy categories, reporter notes, and 1-click structured actions.
- **Marketplace Community**:
  - *Need*: Swift removal of prohibited items and scammers to protect students from fraud or unsafe encounters.
  - *Need*: Fair, auditable enforcement where actions are justified by recorded policy reasons rather than arbitrary moderator whim.
- **Platform Operators & Legal Compliance**:
  - *Invariant*: **Least-Privilege RBAC (AD-017)**. Moderator permissions cannot be self-assigned via user metadata or client tokens; access is governed strictly by `marketplace.moderator_assignments`.
  - *Invariant*: **Immutable Audit Trail**. Every moderation action (dismissal, listing takedown, account suspension) must record moderator ID, action type, target ID, justification reason, and timestamp in an append-only ledger with zero `UPDATE` or `DELETE` permissions.

---

## 3. Product Policies & Engineering Invariants

1. **Marketplace Invariants & Policy (docs/product/01-domain-model.md, docs/product/03-marketplace-policy.md)**:
   - Invariant 1: A user can modify only resources they own unless a moderator action is explicitly authorized.
   - Invariant 9: **Moderation removal and owner archiving are distinct outcomes**. When a moderator takes down a listing, its status moves to `'removed'`. It cannot be relisted by the owner.
   - Removal cascade: When a listing is removed by a moderator:
     - Its status becomes `'removed'`, excluding it permanently from feed, search, and details.
     - Any active reservation on that listing is cancelled (`status = 'cancelled'`, `cancellation_reason = 'moderation_removal'`).
     - Any pending offers on that listing are marked `superseded`.
2. **Account Suspension Lifecycle**:
   - When a user account is suspended by a moderator:
     - User's active listings are removed or archived.
     - Active reservations are cancelled.
     - User session mutations (posting listings, messaging, creating offers) are rejected with HTTP 403 `ACCOUNT_SUSPENDED`.
3. **Auditability & Non-Repudiation (AD-017)**:
   - All moderation actions write immutably to `marketplace.moderation_actions`.
   - `UPDATE` and `DELETE` on `marketplace.moderation_actions` are revoked from all authenticated, anonymous, and public roles.

---

## 4. Upstream Dependencies

- `001-web-supabase-foundation`: Base Next.js App Router, Supabase client infrastructure, test harness.
- `002-identity-accounts`: Session management, user identities, account status flags.
- `004-listing-creation-management`: `marketplace.listings` table and listing lifecycle (`removed` status).
- `008-purchase-intent-offers-reservations`: Reservation cancellation on listing removal.
- `011-reporting-blocking`: `marketplace.reports` table providing the pending moderation queue.

---

## 5. Downstream Dependents

- `013-localization-launch-hardening`: Complete German and English localization of moderation workspace, actions, and audit log exports.
