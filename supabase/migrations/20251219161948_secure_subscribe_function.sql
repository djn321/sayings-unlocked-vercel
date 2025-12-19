-- Remove the insecure SELECT policy that exposes all subscriber data
DROP POLICY IF EXISTS "subscribers_select_after_insert" ON public.subscribers;

-- Create a secure function for subscription that bypasses RLS
-- This function can insert and return only the necessary data
CREATE OR REPLACE FUNCTION public.subscribe_user(user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_subscriber_id UUID;
  new_token TEXT;
BEGIN
  -- Insert the new subscriber
  INSERT INTO public.subscribers (email)
  VALUES (user_email)
  RETURNING id, confirmation_token INTO new_subscriber_id, new_token;

  -- Return only the necessary data
  RETURN json_build_object(
    'id', new_subscriber_id,
    'confirmation_token', new_token,
    'email', user_email
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Email already subscribed';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.subscribe_user(TEXT) TO anon, authenticated;
