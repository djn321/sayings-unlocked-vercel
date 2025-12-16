-- Setup cron job authentication by configuring the service role key
-- This migration creates a helper function to set the configuration

-- Create a function to set up the cron authentication
CREATE OR REPLACE FUNCTION public.setup_cron_authentication(service_role_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the database configuration
  EXECUTE format('ALTER DATABASE %I SET app.settings.service_role_key = %L', 
                 current_database(), 
                 service_role_key);
  
  RETURN 'Cron authentication configured successfully. The database setting app.settings.service_role_key has been set.';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.setup_cron_authentication(TEXT) TO authenticated, service_role;

-- Add a comment explaining how to use this function
COMMENT ON FUNCTION public.setup_cron_authentication(TEXT) IS 
'Sets up cron job authentication by configuring the service role key. 
Usage: SELECT public.setup_cron_authentication(''your_service_role_key_here'');
Note: This function requires SECURITY DEFINER to alter database settings.';
