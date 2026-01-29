-- Enable realtime for profiles table to allow auto-redirect when user is approved
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;