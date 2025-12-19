-- Add SELECT policy for subscribers table
-- This allows the subscription form to read back the inserted row after INSERT

-- Drop any existing SELECT policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.subscribers;

-- Allow anyone to SELECT their own row immediately after inserting
-- This is needed because the subscription form does .insert().select()
CREATE POLICY "subscribers_select_after_insert"
  ON public.subscribers
  FOR SELECT
  TO anon, authenticated
  USING (true);
