-- Schedule daily etymology emails at 8:00 AM UTC every day
SELECT cron.schedule(
  'send-daily-etymology',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://fviryuzkiolzixezvnvq.supabase.co/functions/v1/send-daily-etymology',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2aXJ5dXpraW9seml4ZXp2bnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjk0ODksImV4cCI6MjA3NjcwNTQ4OX0.R21IqOUwOVwRuDCOp87FseYZ8BGGkgB-yCdMZvWncuQ"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);