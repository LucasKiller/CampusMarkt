# Feature Context: 011-reporting-blocking

## 1. Problem Summary

As an open community marketplace operating within Braunschweig, CampusMarkt relies on student trust, mutual respect, and adherence to marketplace policy. In any peer-to-peer ecosystem, harmful edge cases inevitably arise:
- Bad-faith actors listing prohibited goods (e.g. weapons, drugs, alcohol, counterfeit products, stolen property).
- Scammers attempting advance-fee fraud, off-platform payment schemes, or fake deposit requests.
- Users sending abusive, threatening, discriminatory, or sexually harassing messages.
- Privacy violators exposing personal information, room numbers, or unverified contact details.

Without self-service trust and safety mechanisms:
- Users have no confidential way to alert operators to dangerous content or bad-faith participants.
- Victims of harassment cannot protect themselves by immediately severing contact and hiding abusive actors from their personal view.
- Content policy enforcement remains completely blind to private messaging abuse or fraudulent conduct.

Feature `011-reporting-blocking` establishes the foundational trust and safety capabilities of CampusMarkt V1, opening **Horizon 5: Trust, Safety, Localization, and Launch Hardening**.

---

## 2. Target Users & Pain Points

- **Student Buyers and Sellers**:
  - *Pain*: Encountering spam, offensive messages, or suspicious listings without an in-app tool to report them.
  - *Fear of Retaliation*: Hesitation to report bad actors if the reported party can discover their identity.
  - *Need*: 100% confidential reporting with structured categories and immediate self-defense through user blocking.
- **Harassment Victims**:
  - *Pain*: Continued receipt of unwanted messages or persistent offers from an abusive individual.
  - *Need*: A decisive "Block User" action that instantly terminates conversation, prevents further messages or offers, and hides the offending user's listings.
- **Marketplace Integrity & Compliance**:
  - *Invariant*: **Absolute Reporter Confidentiality**. The reported user or listing owner must NEVER learn who filed a report or receive confirmation that a report exists.
  - *Invariant*: Server-boundary enforcement (AD-016). Blocked content must never be leaked across network payloads or application memory buffers.

---

## 3. Product Policies & Engineering Invariants

1. **Marketplace Policy (docs/product/03-marketplace-policy.md)**:
   - Registered users can report a listing or user account.
   - Structured reason taxonomy:
     - `prohibited_content`: Weapons, drugs, adult, hazardous, stolen/counterfeit goods.
     - `fraud_or_scam`: Advance-fee schemes, fake goods, deceptive listing, off-platform payment redirection.
     - `harassment_or_abuse`: Threatening, abusive, discriminatory messages or conduct.
     - `unsupported_content`: Services, jobs, housing, shipping-only, barter/swap.
     - `privacy_violation`: Unsolicited exposure of private personal information or impersonation.
     - `other`: Policy violations not covered above.
   - Self-reporting is strictly forbidden (`reporter_id <> target_id`, cannot report own listing).
   - Duplicate report flood control: Users cannot file multiple pending reports against the same target.
2. **Confidentiality & RLS Invariant (AD-016)**:
   - `marketplace.reports` has RLS granting `INSERT` to authenticated users, but target users have zero `SELECT` visibility. Only the reporter (viewing their submission status) and authorized staff/moderators have read access.
   - Covert timing/channel leak resistance: API responses for reports return identical metadata without leaking target account status.
3. **Bidirectional Blocking Invariant (AD-016)**:
   - Blocking is bidirectional: when User A blocks User B:
     - Neither user sees the other's listings in public feeds or search results.
     - Neither user can initiate or send messages to the other.
     - Neither user can submit purchase intents, offers, or reservations on the other's listings.
   - Unblocking: A user can inspect their blocked users list and unblock a previously blocked user.
   - Self-blocking is rejected (`blocker_id <> blocked_id`).

---

## 4. Upstream Dependencies

- `001-web-supabase-foundation`: Base Next.js App Router, Supabase client infrastructure, test harness.
- `002-identity-accounts`: Session management, authenticated user context (`auth.uid()`).
- `004-listing-creation-management`: `marketplace.listings` table as reportable targets.
- `005-marketplace-feed-listing-details`: Feed and listing details pages hosting reporting modals and block integration.
- `006-search-filters`: Search RPC filtering out blocked users.
- `008-purchase-intent-offers-reservations`: Offer creation rejecting blocked users.
- `009-messaging`: In-app conversation thread hosting report/block actions and blocking message transmission.

---

## 5. Downstream Dependents

- `012-moderation`: Moderator review queue consuming pending reports and applying auditable actions (warning, listing takedown, account suspension).
- `013-localization-launch-hardening`: Complete German and English localization of report categories, blocking dialogs, and safety runbooks.
