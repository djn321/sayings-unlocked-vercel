-- Completely recreate RLS policies for subscribers table
-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Anyone can confirm subscription with valid token" ON public.subscribers;

-- Recreate INSERT policy for anonymous users
CREATE POLICY "Enable insert for anon users"
  ON public.subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Recreate SELECT policy
CREATE POLICY "Enable read for authenticated users"
  ON public.subscribers
  FOR SELECT
  TO authenticated
  USING (auth.email() = email);

-- Recreate UPDATE policy for confirmation
CREATE POLICY "Enable update for confirmation"
  ON public.subscribers
  FOR UPDATE
  TO anon
  USING (confirmation_token IS NOT NULL AND confirmed_at IS NULL)
  WITH CHECK (confirmed_at IS NOT NULL);
