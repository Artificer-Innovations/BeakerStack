-- Enable Realtime for user_profiles table
-- This allows clients to subscribe to changes on the user_profiles table

-- Add the user_profiles table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;

-- Set replica identity to FULL to include all column values in change events
-- This ensures UPDATE events contain both old and new values
ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;
