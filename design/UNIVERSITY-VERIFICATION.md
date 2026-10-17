# Optional university verification — design proposal

> Exports arquivados fora do repositório em 17/10/2026: os nomes de imagens e PDFs abaixo identificam referências históricas. Consulte [localização e manifesto](EXTERNAL-ARTIFACTS.md). As fontes editáveis e os tokens continuam no projeto.

Created 2026-10-16 in page **15 · University verification — direction A** of `CampusMarkt-Redesign.figcraft`. Static drawings pending review. No account, email, camera or verification mutation was performed.

Sources: feature 003 specification/design, feature 014 amendment and AD019 in `.specs/STATE.md`. Active validity is **12 calendar months**, superseding older 180-day wording. Feature 003 has no `context.md`; none was fabricated. Existing requirement-status inconsistencies were not changed.

## Compositions

- Mobile entry, check-inbox/pending, verified owner, expired/renew, disconnect confirmation and acknowledged removal.
- Desktop entry and verified owner, with private explanation.
- Badge on fictional Maya's public profile and chair seller identity, badge explanation and public visibility rules. The same badge can accompany chat identity.
- Recovery board: unsupported domain, email unavailable for this account, invalid/expired/used link, delivery failure, rate limiting and renewal pending with a still-valid badge.

Exports: `15-verification-mobile-overview.png`, `15-badge-contexts.png`, `15-verification-entry-desktop.png`, `15-verification-verified-desktop.png`, `15-verification-recovery.png`; individual mobile states use `15-verification-STATE-mobile.png`.

## Contract

Only TU Braunschweig is supported: `tu-braunschweig.de` and `tu-bs.de`. Verification is optional and never gates marketplace participation. Require an eligible authenticated account with confirmed primary email, excluding deletion-pending accounts. An institutional identity cannot verify multiple active accounts; conflict copy never identifies another owner.

The own-brand graduation-cap badge reads “TU Braunschweig · email verified”. It confirms inbox access, not identity, actual student status, honesty, item quality, trade protection or university endorsement. Public data includes university label/id and current badge status, never email, hashes, timestamps or expiry. Only the owner sees the expiry date. The fictional example expires 16 October 2027; it is not a real verification event.

Pending, expired, revoked and removed states have no public badge. Pending renewal preserves a still-valid badge until expiry or successful renewal. Removal immediately removes the public badge and verification record while retaining marketplace access. Do not show a public expired-status label.

Send a single-use link valid for 24 hours; show pending only after acknowledgement and activate only after confirmation. Expiry is 12 calendar months, not a fixed day count. SMTP failure and invalid links never show success. Retry eligibility comes from server state; account limit 3/hour and IP limit 30/hour. Recovery cards are illustrations, not implemented timers.

The verified view says “University email confirmed” without redisplaying an institutional address presumed stored. Plaintext institutional email must not remain in public/API/log projections after confirmation; persistence follows the approved pseudonymous HMAC contract. Uncertain renewal/removal results refresh authoritative state. Failed removal retains the confirmed state and offers retry. Unconfirmed accounts return to primary-email confirmation. No student-ID upload, SSO or additional university selector was added.

## Review and remaining work

### Social-style university seal — latest proposal, 2026-10-16

The user explicitly accepted this social-style university seal and asked to continue. Keep this emblem as the selected badge; earlier pill versions are superseded. Account B remains selected.

The user requested a recognisable social verification emblem with a university cap. This supersedes the solid text-pill refinement below. The current mark is an original smooth twelve-lobed rosette, solid CampusMarkt teal, with a simplified filled white cap crown and open band/tassel. No generic identity checkmark or university logo is used. Primary placement is immediately after the display name: 28 px in the profile showcase, 24 px beside seller/chat names; 20/24/32 px samples are shown for optical review. The public mobile profile uses 26 px beside its 28 px name. Keep 6–8 px separation and reserve room after long names; do not overlap or wrap the emblem alone.

Research: [LinkedIn verification](https://www.linkedin.com/help/linkedin/answer/a1359065/verifications-on-your-linkedin-profile) places the emblem beside the name and lets viewers inspect active verification details; [Airbnb identity verification](https://www.airbnb.com/help/article/1237) associates verified status with profile identity; [X profile labels](https://help.x.com/en/rules-and-policies/profile-labels) demonstrates distinct visual account signals; [Meta verification design](https://www.meta.com/design-at-meta/blog/a-look-into-monetization-design-at-meta/) discusses reinforcing badge meaning. Visual image references informed the familiar seal silhouette, not reuse of third-party artwork. Their verification criteria and paid business models are not adopted. CampusMarkt continues to confirm institutional inbox access only.

The public profile pairs the name emblem with “TU Braunschweig · email verified” beneath it. In dense seller/chat contexts the emblem opens the same explanation on tap/click and keyboard activation; expose the accessible label “TU Braunschweig university email verified”, a 44 px interaction target, visible focus and a dismissible, focus-managed explanation. Hover-only discovery is insufficient. These are handoff requirements, not implemented interactions. University email and validity dates remain private. Unverified, pending, expired or removed users have no public seal; no public crossed-out badge is introduced.

Native page 15 contains the new showcase and populated mobile profile; all ten prior badge occurrences across pages 14/15 and overviews now use the emblem plus supporting text instead of the pill. Main exports: `15-social-university-seal.png` and `15-public-profile-verified-mobile.png`; affected existing verification/context/overview exports were refreshed. Inspected the showcase, owner status and populated mobile profile. Long-name/DE/320 px and interactive accessibility checks remain.

The user accepted the badge concept on 2026-10-16 and requested more prominence. The refinement uses solid brand teal `#0B665E`, white 13 px bold text (previously 11 px), a stronger 1.8 px cap outline, 40 px height and content-sized 292 px width. This distinguishes the verified signal from pale surfaces without introducing a general identity checkmark. Updated all ten badge occurrences across page 15 and duplicated page-14/15 overviews; re-exported affected PNGs and visually inspected the public contexts and owner screen. The stronger visual treatment is presented for review; meaning, privacy, optional participation and eligibility are unchanged.

Rendered and inspected mobile entry/pending/current/expired, both desktop layouts, badge contexts and recovery cards. Remaining: full German, 320 px/tablet, expiring-soon, desktop recovery dialogs, loading/failed-removal, keyboard/focus announcements, interaction integration and independent end-to-end validation. These designs do not change implementation approvals.
