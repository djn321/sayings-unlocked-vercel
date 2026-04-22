-- Shift cron from 8:00 to 8:05 UTC to avoid thundering herd on the Gemini API
SELECT cron.unschedule('send-daily-etymology');

SELECT cron.schedule(
  'send-daily-etymology',
  '5 8 * * *',  -- Run at 8:05 AM UTC daily
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
