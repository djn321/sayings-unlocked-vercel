-- Add email confirmation columns to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS confirmation_token uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- Update default for is_active to false for new subscriptions
ALTER TABLE public.subscribers 
ALTER COLUMN is_active SET DEFAULT false;

-- Grandfather existing subscribers as confirmed
UPDATE public.subscribers 
SET confirmed_at = subscribed_at, 
    is_active = true 
WHERE confirmed_at IS NULL;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_confirmation_token 
ON public.subscribers(confirmation_token) 
WHERE confirmation_token IS NOT NULL;

-- Add RLS policy to allow confirmation updates
CREATE POLICY "Anyone can confirm subscription with valid token" 
ON public.subscribers 
FOR UPDATE 
USING (confirmation_token IS NOT NULL AND confirmed_at IS NULL)
WITH CHECK (confirmed_at IS NOT NULL);