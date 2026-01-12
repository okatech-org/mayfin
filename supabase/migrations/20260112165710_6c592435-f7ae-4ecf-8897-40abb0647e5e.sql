-- Drop the insecure view that exposes auth.users
DROP VIEW IF EXISTS public.users_with_roles;