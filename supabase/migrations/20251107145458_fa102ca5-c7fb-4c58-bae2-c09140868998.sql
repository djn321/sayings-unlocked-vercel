-- Update the confirm-subscription behavior to properly set is_active
-- Add a check to ensure confirmed_at is set when is_active is true
ALTER TABLE public.subscribers 
  ADD CONSTRAINT subscribers_active_confirmed_check 
  CHECK (
    (is_active = false) OR 
    (is_active = true AND confirmed_at IS NOT NULL)
  );