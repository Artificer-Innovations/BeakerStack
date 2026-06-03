-- Sync OAuth provider display name and avatar into user_profiles on signup and sign-in.
-- Fill-empty-only: never overwrite user-edited profile fields.

CREATE OR REPLACE FUNCTION public.oauth_profile_from_metadata(meta jsonb)
RETURNS TABLE (display_name text, avatar_url text)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    NULLIF(trim(COALESCE(meta->>'full_name', meta->>'name')), '') AS display_name,
    NULLIF(trim(COALESCE(meta->>'avatar_url', meta->>'picture')), '') AS avatar_url;
$$;

REVOKE ALL ON FUNCTION public.oauth_profile_from_metadata(jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  oauth_profile record;
BEGIN
  SELECT * INTO oauth_profile
  FROM public.oauth_profile_from_metadata(NEW.raw_user_meta_data);

  INSERT INTO public.user_profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    public.generate_username(),
    COALESCE(oauth_profile.display_name, NEW.email),
    oauth_profile.avatar_url
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_oauth_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
  oauth_profile record;
  profile_display_name text;
  profile_avatar_url text;
  resolved_display_name text;
BEGIN
  IF NEW.raw_user_meta_data IS NOT DISTINCT FROM OLD.raw_user_meta_data THEN
    RETURN NEW;
  END IF;

  SELECT * INTO oauth_profile
  FROM public.oauth_profile_from_metadata(NEW.raw_user_meta_data);

  SELECT display_name, avatar_url
  INTO profile_display_name, profile_avatar_url
  FROM public.user_profiles
  WHERE user_id = NEW.id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  resolved_display_name := COALESCE(oauth_profile.display_name, NEW.email);

  -- Update each NULL field independently to avoid touching populated columns.
  IF profile_display_name IS NULL AND resolved_display_name IS NOT NULL THEN
    UPDATE public.user_profiles
    SET display_name = resolved_display_name
    WHERE user_id = NEW.id;
  END IF;

  IF profile_avatar_url IS NULL AND oauth_profile.avatar_url IS NOT NULL THEN
    UPDATE public.user_profiles
    SET avatar_url = oauth_profile.avatar_url
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_updated_sync_oauth_profile ON auth.users;

CREATE TRIGGER on_auth_user_updated_sync_oauth_profile
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_oauth_profile_from_auth();
