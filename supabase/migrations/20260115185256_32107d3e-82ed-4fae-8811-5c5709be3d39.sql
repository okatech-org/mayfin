-- Fix RLS policies on user_roles to avoid circular dependency

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access" ON public.user_roles
  FOR ALL USING (auth.role() = 'service_role');

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;

CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);