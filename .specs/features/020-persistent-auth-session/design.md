# Persistent Authentication Session Design

Keep the current raw access cookie so existing server authorization code continues to read a JWT. Add a separate HttpOnly refresh cookie containing the opaque refresh token and initial sign-in time. The sign-in route writes both only after the application service validates the returned Supabase session. A shared cookie module enforces identical attributes and clearing across routes.

The existing Next middleware refreshes an access token when its `exp` is within 60 seconds. It uses the server's internal Supabase URL and publishable key with an ephemeral client, never a browser API or service-role key. On rotation it updates the request cookie before server rendering, sets both response cookies with the remaining absolute lifetime, and disables response caching. The data boundary still checks the live Auth session for protected requests; decoding `exp` in middleware is only a refresh trigger, never authorization.

Logout and account-ending routes clear both cookies. Password reauthentication writes the real newly issued session instead of a placeholder. Focused tests cover expiry edges, rotation, logout, and no token leakage.
