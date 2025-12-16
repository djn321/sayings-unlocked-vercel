import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

/**
 * One-time setup function to configure the cron job authentication
 * This sets the database configuration needed for the cron job to work
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting cron job authentication setup...');

    // Get the service role key from environment
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Missing required environment variables');
    }

    console.log('Service role key found, connecting to database...');

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Call the database function to set up authentication
    console.log('Calling set_cron_service_key function...');
    const { data, error } = await supabase.rpc('set_cron_service_key', {
      key: serviceRoleKey
    });

    if (error) {
      console.error('Failed to setup cron authentication:', error);
      throw new Error(`Database function error: ${error.message}`);
    }

    console.log('Database configuration result:', data);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron job authentication configured successfully',
        details: 'The app.settings.service_role_key has been set in the database'
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in setup-cron-auth function:", error);

    // Get service role key for manual setup instructions
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || '';

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        manual_setup: {
          instructions: 'Run this SQL in Supabase Dashboard > SQL Editor:',
          sql: `ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';`,
          hint: `Your service role key starts with: ${serviceRoleKey.substring(0, 20)}...`
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
