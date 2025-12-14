-- Replace weak UUID-based confirmation tokens with cryptographically secure random tokens
-- UUIDs only have 122 bits of entropy; we increase entropy by concatenating two UUIDs

-- Drop policy that depends on confirmation_token column
DROP POLICY IF EXISTS "Allow email confirmation" ON public.subscribers;

-- Change confirmation_token from uuid to text
-- Using two UUIDs concatenated (without hyphens) gives us 244 bits of entropy
ALTER TABLE public.subscribers
  ALTER COLUMN confirmation_token TYPE text
  USING replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

-- Update default to generate secure random tokens (244 bits)
ALTER TABLE public.subscribers
  ALTER COLUMN confirmation_token SET DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

-- Regenerate all existing unconfirmed tokens with secure random values
UPDATE public.subscribers
SET confirmation_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE confirmed_at IS NULL;

-- Recreate the policy with text type
CREATE POLICY "Allow email confirmation"
  ON public.subscribers
  FOR UPDATE
  TO anon
  USING (confirmation_token IS NOT NULL AND confirmed_at IS NULL)
  WITH CHECK (confirmed_at IS NOT NULL);
