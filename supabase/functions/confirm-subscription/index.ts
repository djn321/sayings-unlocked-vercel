import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const siteUrl = Deno.env.get('SITE_URL');
if (!siteUrl) {
  throw new Error('SITE_URL environment variable must be configured');
}

const corsHeaders = {
  "Access-Control-Allow-Origin": siteUrl,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token }: ConfirmRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update the subscriber with the matching token
    const { data, error } = await supabase
      .from("subscribers")
      .update({
        confirmed_at: new Date().toISOString(),
        is_active: true,
      })
      .eq("confirmation_token", token)
      .is("confirmed_at", null)
      .select()
      .single();

    if (error || !data) {
      console.error("Confirmation error:", error);
      return new Response(
        JSON.stringify({ error: "Invalid or expired confirmation token" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Subscription confirmed for email:", data.email);

    return new Response(
      JSON.stringify({ success: true, email: data.email }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in confirm-subscription function:", error);
    // Don't leak internal error details to users
    return new Response(
      JSON.stringify({ error: "An internal error occurred during confirmation" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
