-- Profile discoverability for connections search (owned by profile system, not connections package)

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS is_discoverable boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_discoverable_username
    ON public.user_profiles (username)
    WHERE is_discoverable = true;
