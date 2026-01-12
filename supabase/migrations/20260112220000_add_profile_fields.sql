-- Add date_of_birth field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add position/poste field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS position VARCHAR(100);
