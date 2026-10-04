# Inbox Repair Design

- Build a fresh user-token Supabase client per request after the session DAL verifies the identity. Do not cache a client or service across users.
- Read private message history through a participant-checked RPC in the already exposed `marketplace_api` schema. Use `(created_at, id)` cursor ordering and keep the private `marketplace` schema unexposed. The browser sends the oldest or newest loaded message ID; the API accepts legacy timestamp cursors too.
- Enforce the existing 30 messages/minute limit in the database transaction, since the request-scoped service cannot retain a reliable counter across requests.
- Resolve the current user's public profile ID before comparing it with a listing seller's public ID for owner-only actions.
- Distinguish an empty inbox from dependency failure at the server page. Keep drafts and show a send error at the composer.
- Reconcile new messages, read receipts in the latest 50-message page, and failed mark-read calls while the thread is open. Follow all available keyset pages when the tab returns. The existing four-second polling transport remains until a separate secure Realtime transport is specified and approved; Feature 009's sub-second delivery criterion is still open. Read receipts in older loaded pages refresh when those pages are loaded again.
- Reuse the site's canvas, teal, ink, border, and surface CSS tokens. Conversation list and thread use consistent responsive gutters, clear listing context, readable sender/time labels, and visible focus states.
- Resolve the active locale on the server and pass translated labels to client components; keep message text untouched.
