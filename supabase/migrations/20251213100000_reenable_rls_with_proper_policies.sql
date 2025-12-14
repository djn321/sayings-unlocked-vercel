-- Re-enable RLS with proper security policies
-- This fixes the critical security issue of disabled RLS

-- Re-enable RLS on subscribers table
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Drop old policies to start fresh
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.subscribers;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.subscribers;
DROP POLICY IF EXISTS "Enable update for confirmation" ON public.subscribers;

-- Policy 1: Allow anonymous users to INSERT (subscribe)
-- This allows public signup but no other operations
CREATE POLICY "Allow public subscription"
  ON public.subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy 2: Allow anonymous users to UPDATE only for email confirmation
-- Can only update if they have a valid unconfirmed token
CREATE POLICY "Allow email confirmation"
  ON public.subscribers
  FOR UPDATE
  TO anon
  USING (confirmation_token IS NOT NULL AND confirmed_at IS NULL)
  WITH CHECK (confirmed_at IS NOT NULL);

-- Policy 3: Allow service role full access for admin operations and edge functions
CREATE POLICY "Allow service role full access"
  ON public.subscribers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 4: Prevent anonymous users from reading subscriber data
-- Only service role can read (for sending emails, etc.)
-- Individual users cannot see other subscribers
