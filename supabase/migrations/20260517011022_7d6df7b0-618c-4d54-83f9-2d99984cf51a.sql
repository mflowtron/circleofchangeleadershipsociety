-- Prevent broad authenticated access to onesignal_player_id while keeping
-- the rest of the profile fields visible. Edge functions use the service
-- role and are unaffected.
REVOKE SELECT (onesignal_player_id) ON public.profiles FROM anon, authenticated;