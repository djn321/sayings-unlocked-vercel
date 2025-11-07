-- Add RLS policies for cron_secrets table
-- Only allow service role to access cron secrets

-- Service role can read secrets
CREATE POLICY "Service role can read cron secrets"
ON public.cron_secrets
FOR SELECT
TO service_role
USING (true);

-- Service role can insert secrets
CREATE POLICY "Service role can insert cron secrets"
ON public.cron_secrets
FOR INSERT
TO service_role
WITH CHECK (true);

-- Service role can update secrets
CREATE POLICY "Service role can update cron secrets"
ON public.cron_secrets
FOR UPDATE
TO service_role
USING (true);

-- Service role can delete secrets
CREATE POLICY "Service role can delete cron secrets"
ON public.cron_secrets
FOR DELETE
TO service_role
USING (true);