-- Create table to track login attempts
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Create index for efficient lookups
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for tracking (before auth)
CREATE POLICY "Allow anonymous insert" ON public.login_attempts
  FOR INSERT WITH CHECK (true);

-- Only service role can read/delete
CREATE POLICY "Service role full access" ON public.login_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(check_email TEXT, max_attempts INT DEFAULT 5, lockout_minutes INT DEFAULT 15)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_count INT;
BEGIN
  SELECT COUNT(*) INTO failed_count
  FROM public.login_attempts
  WHERE email = check_email
    AND success = false
    AND attempted_at > (now() - (lockout_minutes || ' minutes')::interval);
  
  RETURN failed_count >= max_attempts;
END;
$$;

-- Create function to get remaining lockout time
CREATE OR REPLACE FUNCTION public.get_lockout_remaining(check_email TEXT, lockout_minutes INT DEFAULT 15)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_attempt TIMESTAMP WITH TIME ZONE;
  unlock_time TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT MAX(attempted_at) INTO last_attempt
  FROM public.login_attempts
  WHERE email = check_email
    AND success = false;
  
  IF last_attempt IS NULL THEN
    RETURN 0;
  END IF;
  
  unlock_time := last_attempt + (lockout_minutes || ' minutes')::interval;
  
  IF unlock_time <= now() THEN
    RETURN 0;
  END IF;
  
  RETURN EXTRACT(EPOCH FROM (unlock_time - now()))::INT;
END;
$$;

-- Create function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(attempt_email TEXT, attempt_ip TEXT DEFAULT NULL, was_successful BOOLEAN DEFAULT false)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, ip_address, success)
  VALUES (attempt_email, attempt_ip, was_successful);
  
  -- Clean up old attempts (older than 24 hours) to prevent table bloat
  DELETE FROM public.login_attempts
  WHERE attempted_at < (now() - interval '24 hours');
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_account_locked TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_lockout_remaining TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt TO anon, authenticated;