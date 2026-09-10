-- Restore pg_cron as the trigger for send-daily-etymology.
--
-- The GitHub Actions "schedule" trigger we moved to was found to be
-- unreliable in practice: it fired ~4.5 hours late on three consecutive
-- days (08:05 UTC target, actual fires at 12:42, 12:49, and 12:47 UTC).
-- pg_cron's timing was never the problem with the old setup - only its
-- auth/secret-storage plumbing was, and that machinery
-- (public.get_cron_service_key()) was deliberately left in place, unused,
-- when the old job was unscheduled. This just re-points it at the current
-- send-daily-etymology function, which itself is unchanged - only the
-- trigger mechanism moves back.
SELECT cron.schedule(
  'send-daily-etymology',
  '5 8 * * *',  -- 08:05 UTC daily
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
