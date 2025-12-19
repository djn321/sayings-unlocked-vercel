-- Fix RLS policies for subscribers table to allow anonymous subscriptions
-- This ensures new users can sign up through the subscription form

-- Drop all existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
DROP POLICY IF EXISTS "Allow public subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.subscribers;

-- Ensure RLS is enabled
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create a single, clear INSERT policy for anonymous and authenticated users
-- This allows anyone to insert new subscribers
CREATE POLICY "subscribers_insert_policy"
  ON public.subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Verify the UPDATE policy exists for email confirmation
-- Drop and recreate to ensure it's correct
DROP POLICY IF EXISTS "Allow email confirmation" ON public.subscribers;
DROP POLICY IF EXISTS "Enable update for confirmation" ON public.subscribers;

CREATE POLICY "subscribers_update_for_confirmation"
  ON public.subscribers
  FOR UPDATE
  TO anon, authenticated
  USING (confirmation_token IS NOT NULL AND confirmed_at IS NULL)
  WITH CHECK (confirmed_at IS NOT NULL);

-- Ensure service role has full access for admin operations
DROP POLICY IF EXISTS "Allow service role full access" ON public.subscribers;

CREATE POLICY "subscribers_service_role_all"
  ON public.subscribers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
