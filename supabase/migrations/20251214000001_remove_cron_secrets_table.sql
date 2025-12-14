-- Remove insecure cron_secrets table and use Supabase service role key instead
-- Secrets should never be stored in database tables, even with RLS

-- Drop the existing cron job
SELECT cron.unschedule('send-daily-etymology');

-- Drop the insecure table and function
DROP FUNCTION IF EXISTS public.get_cron_secret();
DROP TABLE IF EXISTS public.cron_secrets CASCADE;

-- Recreate the cron job using Supabase's built-in service role key
-- The service role key is securely available in the database environment
SELECT cron.schedule(
  'send-daily-etymology',
  '0 8 * * *',  -- Run at 8:00 AM UTC daily
  $$
  SELECT
    net.http_post(
      url:='https://vmsdalzjlkuilzcetztv.supabase.co/functions/v1/send-daily-etymology',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);
