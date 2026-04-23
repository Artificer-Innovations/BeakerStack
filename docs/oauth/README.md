# OAuth documentation

Google (and optional Apple) sign-in is wired in the apps; you supply provider credentials and Supabase settings.

## Which guide should I read?

1. **[OAUTH_QUICK_SETUP.md](OAUTH_QUICK_SETUP.md)** — Fastest path for **local** Google OAuth with Supabase (redirect URLs, `config.toml`, `.env.local`). Start here if you only need localhost working.
2. **[OAUTH_SETUP.md](OAUTH_SETUP.md)** — Full **production** checklist (Google + Apple, Supabase dashboard, redirect URLs, troubleshooting). Use this when preparing staging/production.
3. **[MOBILE_OAUTH_SETUP.md](MOBILE_OAUTH_SETUP.md)** — How the **native** flow differs from web (deep links, `expo-auth-session`, bundle IDs).

## Testing

- **[../testing/TESTING_OAUTH.md](../testing/TESTING_OAUTH.md)** — Verifying OAuth flows after configuration.
- **[../testing/TESTING_PROTECTED_ROUTES.md](../testing/TESTING_PROTECTED_ROUTES.md)** — Manual checks for auth-gated navigation on web and mobile.

Return to the [documentation index](../README.md) or [QUICKSTART.md](../../QUICKSTART.md).
