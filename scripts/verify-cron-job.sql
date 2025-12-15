-- Script to verify and configure the cron job for sending daily etymologies
--
-- This script:
-- 1. Checks if the cron job is scheduled
-- 2. Verifies the service role key setting
-- 3. Recreates the cron job if needed

-- Step 1: Check if cron job exists
SELECT * FROM cron.job WHERE jobname = 'send-daily-etymology';

-- Step 2: Check if the service role key setting exists
-- Note: This will fail if the setting doesn't exist, which is expected
SELECT current_setting('app.settings.service_role_key', true);

-- Step 3: If the cron job needs to be recreated, use this:
-- First unschedule any existing job
SELECT cron.unschedule('send-daily-etymology');

-- Then create the new job
-- Note: Replace the URL with your actual Supabase project URL
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

-- Step 4: To set the service role key setting (run this if the setting doesn't exist):
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your_service_role_key_here';
