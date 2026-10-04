# Listing Photo Upload Repair Design

The upload-intent route validates the provider URL and returns its signed Storage path and query on the site origin. It never returns an internal Docker hostname. The browser sends a multipart `PUT` compatible with Supabase Storage and records a photo only after a successful response.

The creation form routes file-picker and drop events through one upload function. The existing limits remain unchanged. The management editor uses the same transport so adding a photo to an existing listing follows the repaired path. No database or Storage policy changes are needed.
