-- Fix remaining policies (service role policy already exists)
DROP POLICY IF EXISTS "Service role has full access" ON public.user_roles;

CREATE POLICY "Service role has full access" ON public.user_roles
  FOR ALL USING (auth.role() = 'service_role');