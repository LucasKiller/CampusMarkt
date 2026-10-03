# Password Entry Usability Context

The operator requested visible-password controls for login and registration, confirmation in registration, and progressive green password guidance. Existing forms are in `apps/web/src/app/(identity)/sessions/sign-in-form.tsx` and `registration/registration-form.tsx`. The approved identity specification accepts 10-128 Unicode characters with no composition rule. `DESIGN.md` supplies the existing teal, neutral, and accessible field treatment.

The guidance is a length-progress indicator, not a password-cracking estimate. Ten characters is mandatory; longer milestones are optional. Registration confirmation stays browser-only.
