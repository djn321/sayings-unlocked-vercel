# Cron Job Setup Guide

## Current Status

✅ **Cron job is configured and active**
- Runs daily at 8:00 AM UTC
- Calls the `send-daily-etymology` edge function

❌ **Authentication is NOT configured**
- The cron job cannot authenticate without the service role key setting

## Fix Required

The cron job needs the database setting `app.settings.service_role_key` to authenticate when calling the edge function.

### Step-by-Step Fix:

1. **Get your service role key:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard/project/vmsdalzjlkuilzcetztv/settings/api)
   - Navigate to: Settings > API
   - Copy the `service_role` key (starts with `eyJ...`)
   - ⚠️ **Keep this secret secure - never commit it to git!**

2. **Set the database configuration:**
   - Open the [SQL Editor](https://supabase.com/dashboard/project/vmsdalzjlkuilzcetztv/sql/new)
   - Run this SQL command:

   ```sql
   ALTER DATABASE postgres SET app.settings.service_role_key = 'your_service_role_key_here';
   ```

   Replace `your_service_role_key_here` with the actual service role key from step 1.

3. **Verify the setup:**
   - The cron job should now be able to authenticate
   - It will automatically run at 8:00 AM UTC daily
   - You can manually test by calling the endpoint with the service role key

## Manual Testing

To manually trigger the email send (⚠️ this will send emails to all active subscribers):

```bash
curl -X POST "https://vmsdalzjlkuilzcetztv.supabase.co/functions/v1/send-daily-etymology" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Monitoring

Check if the cron job ran successfully:

1. Go to Supabase Dashboard > Database > Cron Jobs
2. Look for the `send-daily-etymology` job
3. Check the last run time and status

Or query via SQL:

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = 5
ORDER BY start_time DESC
LIMIT 10;
```

## Alternative: External Cron Service

If you prefer not to store the service role key in the database, you can:

1. Disable the Supabase cron job:
   ```sql
   SELECT cron.unschedule('send-daily-etymology');
   ```

2. Use an external service like GitHub Actions, EasyCron, or cron-job.org to call the endpoint with the service role key stored as an environment variable/secret.
