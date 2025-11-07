-- Create a table to track which etymologies have been sent
CREATE TABLE IF NOT EXISTS public.etymology_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etymology_saying text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  cycle_number integer NOT NULL DEFAULT 1
);

-- Enable RLS
ALTER TABLE public.etymology_sends ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role can manage etymology sends"
ON public.etymology_sends
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create an index for faster lookups
CREATE INDEX idx_etymology_sends_cycle ON public.etymology_sends(cycle_number, sent_at DESC);

-- Create a function to get the current cycle number
CREATE OR REPLACE FUNCTION public.get_current_etymology_cycle()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_cycle integer;
BEGIN
  -- Get the latest cycle number
  SELECT COALESCE(MAX(cycle_number), 1) INTO current_cycle
  FROM etymology_sends;
  
  RETURN current_cycle;
END;
$$;