-- Create etymology_feedback table to track subscriber feedback
CREATE TABLE public.etymology_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etymology_saying TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('like', 'dislike')),
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.etymology_feedback ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserting feedback
CREATE POLICY "Anyone can submit feedback with valid subscriber ID"
ON public.etymology_feedback
FOR INSERT
WITH CHECK (true);

-- Policy to allow service role to read feedback
CREATE POLICY "Service role can read all feedback"
ON public.etymology_feedback
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_etymology_feedback_saying ON public.etymology_feedback(etymology_saying);
CREATE INDEX idx_etymology_feedback_created_at ON public.etymology_feedback(created_at DESC);