-- Add missing columns to profiles table for extended user information
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS position character varying(255);