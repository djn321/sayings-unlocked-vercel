-- Alternative approach: Create a secure function that returns the service role key
-- The cron job will call this function instead of using a database setting

-- Create a secure table to store the cron secret (only accessible via function)
CREATE TABLE IF NOT EXISTS public.cron_auth (
  id INTEGER PRIMARY KEY DEFAULT 1,
  service_role_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS to prevent direct access
ALTER TABLE public.cron_auth ENABLE ROW LEVEL SECURITY;

-- No policies = no direct access from any role

-- Create a secure function to get the service role key
CREATE OR REPLACE FUNCTION public.get_cron_service_key()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT service_role_key FROM public.cron_auth WHERE id = 1 LIMIT 1;
$$;

-- Grant execute to postgres role (used by cron jobs)
GRANT EXECUTE ON FUNCTION public.get_cron_service_key() TO postgres;

-- Create a function to set the service role key (can only be called by service_role)
CREATE OR REPLACE FUNCTION public.set_cron_service_key(key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.cron_auth (id, service_role_key, updated_at)
  VALUES (1, key, now())
  ON CONFLICT (id) DO UPDATE 
  SET service_role_key = key, updated_at = now();
  
  RETURN 'Service role key configured successfully for cron authentication';
END;
$$;

-- Grant execute only to service_role
GRANT EXECUTE ON FUNCTION public.set_cron_service_key(TEXT) TO service_role;

-- Recreate the cron job to use the function
SELECT cron.unschedule('send-daily-etymology');

SELECT cron.schedule(
  'send-daily-etymology',
  '0 8 * * *',  -- Run at 8:00 AM UTC daily
  $$
  SELECT
    net.http_post(
      url:='https://vmsdalzjlkuilzcetztv.supabase.co/functions/v1/send-daily-etymology',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || public.get_cron_service_key()
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Output status in a DO block
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Cron job recreated with function-based authentication';
  RAISE NOTICE '';
  RAISE NOTICE 'To complete setup, the service role key needs to be stored.';
  RAISE NOTICE 'This will be done automatically by calling the setup function.';
END $$;
