# Feature Context: 010-pickup-completion

## 1. Problem Summary

In peer-to-peer campus marketplaces, the final step of a transaction is the physical handover. Once a buyer and seller have agreed on an offer or purchase intent and reserved the item (Feature 008) and coordinated meeting logistics in chat (Feature 009), they meet in person on campus (e.g. Mensa 1, Universitätsplatz, library foyer).

At the meeting:
- The buyer physically inspects the item to ensure it matches the description and condition.
- The buyer pays the agreed price in cash or direct bank transfer (V1 zero-escrow financial boundary).
- The seller hands over the physical good.

Without a structured completion mechanism:
- Reserved listings stay in limbo as `RESERVED` indefinitely, cluttering the user's dashboard and obscuring true sales records.
- Buyers and sellers lack a durable transaction receipt and purchase history.
- Users have no guidance on safe public meeting spots on campus, risking isolated meetups or unsafe payment practices.

Feature `010-pickup-completion` establishes the completion and safe-handover lifecycle for CampusMarkt V1, closing **Horizon 4**.

---

## 2. Target Users & Pain Points

- **Student Sellers**:
  - *Pain*: After handing over the textbook or bike and receiving cash, the listing remains stuck in "Reserved" on their profile unless they manually find and delete it.
  - *Need*: A clear 1-click action ("Übergabe abschließen" / "Als verkauft markieren") that marks the reservation `COMPLETED` and the listing `SOLD`.
- **Student Buyers**:
  - *Pain*: Worrying about unsafe pickup locations or pressure to pay before physically inspecting the item.
  - *Need*: Clear, visible campus safety guidance (recommend busy public spots, daylight, inspect before cash payment) and a clean "Meine Käufe" (Purchase History) view showing completed transactions.
- **Platform Safety & Legal Boundaries**:
  - *Invariant*: **Zero platform-held funds**. CampusMarkt is not an escrow service, bank, or payment processor. Payments occur strictly in-person between students.
  - *Invariant*: Clear separation of completion from reviews/ratings (which are explicitly deferred beyond V1).

---

## 3. Product Policies & Engineering Invariants

1. **Marketplace Invariants (docs/product/01-domain-model.md)**:
   - A seller can mark the physical good as sold or transferred according to the reservation feature (Domain Model §Reservation).
   - Only authorized participants (seller and buyer) can view reservation details and transaction receipts.
   - Only the seller can execute the completion transition (`marketplace_api.complete_pickup`).
   - Listing status transitions atomically from `RESERVED` to `SOLD`.
   - Reservation status transitions atomically from `ACTIVE` to `COMPLETED`.
   - Once completed, the reservation and listing statuses are terminal (cannot be cancelled or relisted).
2. **Pre-Completion Cancellation**:
   - Symmetrical pre-completion cancellation remains active: either party can cancel before handover occurs, atomically returning the listing to `ACTIVE` inventory with structured reason.
   - Row-level locking on PostgreSQL (`SELECT ... FOR UPDATE OF l`) guarantees serializability against race conditions between completion and cancellation.
3. **Safe Pickup Guidance**:
   - Proactive safety checklist surfaced on the reservation card and conversation view:
     - 1. Meet in busy, well-lit campus areas (e.g. Mensa 1, Universitätsplatz, Central Campus Library).
     - 2. Inspect the physical item in person before paying.
     - 3. Pay exact cash or instant direct transfer only upon handover. Never transfer funds in advance.

---

## 4. Upstream Dependencies

- `001-web-supabase-foundation`: Base Next.js App Router, Supabase client infrastructure, test harness.
- `002-identity-accounts`: Session management, user identities.
- `003-university-verification`: Trust badge projection on transaction history and partner profiles.
- `004-listing-creation-management`: `marketplace.listings` table and `sold` listing status.
- `008-purchase-intent-offers-reservations`: `marketplace.reservations` table and reservation state machine (`active`, `cancelled`, `completed`).
- `009-messaging`: In-app conversation thread displaying sticky negotiation and pickup status.

---

## 5. Downstream Dependents

- `011-reporting-blocking`: Reporting transactions or users if bad faith occurs during/after handover.
- `012-moderation`: Moderator auditability of completed transaction logs.
- `013-localization-launch-hardening`: German/English localization of completion receipts and safety runbooks.
