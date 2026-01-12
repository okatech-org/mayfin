-- Create a view to get users with their roles (accessible by admins only)
CREATE OR REPLACE VIEW public.users_with_roles AS
SELECT 
  au.id as user_id,
  au.email,
  au.created_at,
  ur.role,
  ur.id as role_id
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id;

-- Grant access to the view
GRANT SELECT ON public.users_with_roles TO authenticated;

-- Create a security definer function to get all users with roles (for admins)
CREATE OR REPLACE FUNCTION public.get_all_users_with_roles()
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz,
  role text,
  role_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    au.id as user_id,
    au.email::text,
    au.created_at,
    ur.role::text,
    ur.id as role_id
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON au.id = ur.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY au.created_at DESC;
$$;

-- Create a security definer function to update user role (for admins)
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id uuid, new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;
  
  -- Prevent admin from removing their own admin role
  IF target_user_id = auth.uid() AND new_role != 'admin' THEN
    RAISE EXCEPTION 'You cannot remove your own admin role';
  END IF;
  
  -- Update or insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) 
  DO NOTHING;
  
  -- Delete other roles for this user (keeping only the new one)
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id AND role != new_role;
  
  RETURN true;
END;
$$;