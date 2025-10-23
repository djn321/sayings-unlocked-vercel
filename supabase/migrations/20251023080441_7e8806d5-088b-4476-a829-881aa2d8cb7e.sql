-- Fix public data exposure: Restrict subscriber SELECT to authenticated users viewing their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscribers;

CREATE POLICY "Users can view own subscription" ON public.subscribers
FOR SELECT 
USING (auth.email() = email);