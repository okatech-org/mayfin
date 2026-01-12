-- =============================================
-- MayFin Seed Data
-- =============================================
-- This seed file should be run AFTER creating the admin user in Supabase Auth.
-- 
-- Admin credentials:
--   Email: admin@mayfin.pro
--   Password: Sang@ni1989*
--
-- To run this seed:
--   1. Create admin user in Supabase Dashboard -> Authentication -> Users -> Add user
--   2. Copy the user UUID from the dashboard
--   3. Replace 'ADMIN_USER_ID_PLACEHOLDER' below with the actual UUID
--   4. Run: psql -f seed.sql or via Supabase SQL Editor
-- =============================================

-- Function to update admin profile once the user is created
-- This will be triggered automatically when the admin user signs up
CREATE OR REPLACE FUNCTION public.seed_admin_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find admin user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@mayfin.pro'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Update profile with admin details
    UPDATE public.profiles
    SET 
      first_name = 'Rudie',
      last_name = 'SANGANI MAYOMBO',
      email = 'admin@mayfin.pro',
      phone = '+33 6 61 66 37 01',
      date_of_birth = '1989-03-21'::DATE,
      role = 'admin',
      updated_at = now()
    WHERE user_id = admin_user_id;

    -- Ensure admin role exists in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Remove any charge_affaires role if exists (admin only needs admin role)
    DELETE FROM public.user_roles 
    WHERE user_id = admin_user_id AND role = 'charge_affaires';

    RAISE NOTICE 'Admin profile seeded successfully for user %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user not found. Please create user with email admin@mayfin.pro first.';
  END IF;
END;
$$;

-- Execute the seed function
SELECT public.seed_admin_profile();

-- Optional: Drop the function after use (uncomment if desired)
-- DROP FUNCTION IF EXISTS public.seed_admin_profile();
