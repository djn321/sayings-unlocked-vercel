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

// Verify signed unsubscribe token
async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  const secretKey = Deno.env.get('FEEDBACK_TOKEN_SECRET');
  if (!secretKey) {
    throw new Error('FEEDBACK_TOKEN_SECRET not configured');
  }

  try {
    const [subscriberId, timestamp, signature] = token.split('.');

    if (!subscriberId || !timestamp || !signature) {
      return null;
    }

    // Verify signature
    const message = `${subscriberId}.${timestamp}.unsubscribe`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureData = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureData,
      messageData
    );

    if (!isValid) {
      console.log('Invalid signature');
      return null;
    }

    return subscriberId;
  } catch (error: unknown) {
    console.error('Token verification error:', error);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing unsubscribe token' }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify token and extract subscriber ID
    const subscriberId = await verifyUnsubscribeToken(token);

    if (!subscriberId) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired unsubscribe token' }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Mark subscriber as inactive
    const { data, error } = await supabase
      .from("subscribers")
      .update({ is_active: false })
      .eq("id", subscriberId)
      .select()
      .single();

    if (error || !data) {
      console.error("Unsubscribe error:", error);
      throw new Error('Failed to unsubscribe');
    }

    console.log("Unsubscribed:", data.email);

    // Redirect to unsubscribe confirmation page
    const siteUrl = Deno.env.get('SITE_URL');
    if (!siteUrl) {
      throw new Error('SITE_URL environment variable not configured');
    }

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `${siteUrl}/unsubscribe-success`,
      },
    });
  } catch (error: unknown) {
    console.error("Error in unsubscribe function:", error);
    // Don't leak internal error details to users
    return new Response(
      JSON.stringify({ error: "An internal error occurred while unsubscribing" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
