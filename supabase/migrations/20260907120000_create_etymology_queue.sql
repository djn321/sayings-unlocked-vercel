-- Append-only pre-generated etymology queue.
-- Content is generated ahead of time (see generate-etymology-batch function) and
-- consumed deterministically by sequence_number, so there is no "pending"/"sent"
-- state to mutate and no risk of double-consuming a row.
CREATE TABLE public.etymology_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  saying text NOT NULL,
  origin text NOT NULL,
  meaning text NOT NULL,
  era text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.etymology_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage etymology queue"
ON public.etymology_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX idx_etymology_queue_sequence ON public.etymology_queue(sequence_number);
