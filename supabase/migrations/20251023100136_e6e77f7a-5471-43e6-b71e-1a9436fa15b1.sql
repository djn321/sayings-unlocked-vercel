-- Drop the existing cron job
SELECT cron.unschedule('send-daily-etymology');

-- Recreate with CRON_SECRET authentication
SELECT cron.schedule(
  'send-daily-etymology',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://fviryuzkiolzixezvnvq.supabase.co/functions/v1/send-daily-etymology',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);