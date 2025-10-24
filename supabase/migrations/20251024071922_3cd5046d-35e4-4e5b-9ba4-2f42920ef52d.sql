-- Drop the existing cron job first
SELECT cron.unschedule('send-daily-etymology');

-- Create a secure table in public schema to store the cron secret
CREATE TABLE IF NOT EXISTS public.cron_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and ensure no one can access this table except through the function
ALTER TABLE public.cron_secrets ENABLE ROW LEVEL SECURITY;

-- No policies = no direct access from client

-- Create a secure function to retrieve the cron secret
CREATE OR REPLACE FUNCTION public.get_cron_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT value FROM public.cron_secrets WHERE key = 'send_daily_etymology' LIMIT 1;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_cron_secret() TO postgres, anon, authenticated, service_role;

-- Insert the placeholder for the cron secret
-- The user needs to update this value manually with: UPDATE public.cron_secrets SET value = 'YOUR_ACTUAL_CRON_SECRET' WHERE key = 'send_daily_etymology';
INSERT INTO public.cron_secrets (key, value)
VALUES ('send_daily_etymology', 'TEMPORARY_PLACEHOLDER_UPDATE_ME')
ON CONFLICT (key) DO NOTHING;

-- Recreate the cron job using the secure function
SELECT cron.schedule(
  'send-daily-etymology',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://fviryuzkiolzixezvnvq.supabase.co/functions/v1/send-daily-etymology',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || public.get_cron_secret()
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);