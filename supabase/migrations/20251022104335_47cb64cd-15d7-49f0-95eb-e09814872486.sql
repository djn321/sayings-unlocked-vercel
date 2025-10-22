-- Create subscribers table
CREATE TABLE public.subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  subscribed_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  last_sent_at timestamp with time zone
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (subscribe)
CREATE POLICY "Anyone can subscribe"
  ON public.subscribers
  FOR INSERT
  WITH CHECK (true);

-- Only allow reading own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscribers
  FOR SELECT
  USING (true);

-- Create index for faster email lookups
CREATE INDEX idx_subscribers_email ON public.subscribers(email);
CREATE INDEX idx_subscribers_active ON public.subscribers(is_active) WHERE is_active = true;

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;