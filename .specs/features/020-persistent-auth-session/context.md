# Persistent Authentication Session Context

The operator asked for correct login persistence and refresh-token behavior. Feature 002 already requires sessions across browser restarts for no more than 30 days. The deployed Coolify Compose defaults to a 3600-second access JWT and 720-hour Auth timebox. The current login route sets only a raw access JWT with a 30-day cookie max age; `refreshSession` exists in the provider adapter but is not called on requests. The existing server-side data boundary validates JWT expiry and live Auth sessions.

The browser must receive only HttpOnly cookies. A legacy access-only cookie cannot be renewed, so it remains valid only until its access JWT expires.
