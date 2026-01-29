import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Get CORS origin - use environment variable or fallback for development
const getCorsOrigin = () => {
  return Deno.env.get('SITE_URL') || 'https://sayings-unlocked.vercel.app';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getCorsOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify HMAC-signed token and extract subscriber ID
async function verifyFeedbackToken(token: string, saying: string): Promise<string | null> {
  const secretKey = Deno.env.get('FEEDBACK_TOKEN_SECRET');
  if (!secretKey) {
    throw new Error('FEEDBACK_TOKEN_SECRET not configured');
  }

  try {
    const [subscriberId, timestamp, signature] = token.split('.');

    if (!subscriberId || !timestamp || !signature) {
      return null;
    }

    // Check if token is expired (valid for 48 hours)
    const tokenTime = parseInt(timestamp);
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;

    if (now - tokenTime > fortyEightHours) {
      console.log('Token expired');
      return null;
    }

    // Verify signature
    const message = `${subscriberId}.${timestamp}.${saying}`;
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
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const saying = url.searchParams.get('saying');
    const feedbackType = url.searchParams.get('feedback');

    console.log('Feedback request received:', { hasToken: !!token, hasSaying: !!saying, feedbackType });

    // Validate inputs
    if (!token || !saying || !feedbackType) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify token and extract subscriber ID
    const subscriberId = await verifyFeedbackToken(token, saying);

    if (!subscriberId) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired feedback token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate feedback type
    if (feedbackType !== 'like' && feedbackType !== 'dislike') {
      return new Response(
        JSON.stringify({ error: 'Invalid feedback type. Must be "like" or "dislike"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate saying parameter
    if (!saying || saying.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Saying parameter cannot be empty' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (saying.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Saying text too long' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate saying contains only reasonable characters (alphanumeric, spaces, and common punctuation)
    const validSayingPattern = /^[a-zA-Z0-9\s.,!?'"()\-:;]+$/;
    if (!validSayingPattern.test(saying)) {
      return new Response(
        JSON.stringify({ error: 'Saying contains invalid characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if feedback already exists for this subscriber and saying
    // One-time use: reject if feedback already recorded (no updates allowed)
    const { data: existingFeedback } = await supabase
      .from('etymology_feedback')
      .select('id, feedback_type')
      .eq('subscriber_id', subscriberId)
      .eq('etymology_saying', saying)
      .single();

    if (existingFeedback) {
      // Feedback already recorded - token has been used
      return new Response(
        JSON.stringify({
          error: 'Feedback already recorded',
          message: 'Thank you! Your feedback has already been recorded for this etymology.'
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert new feedback
    const { error: insertError } = await supabase
      .from('etymology_feedback')
      .insert({
        etymology_saying: saying,
        feedback_type: feedbackType,
        subscriber_id: subscriberId,
      });

    if (insertError) {
      console.error('Error inserting feedback:', insertError);
      throw insertError;
    }

    console.log(`Recorded ${feedbackType} feedback for subscriber ${subscriberId}`);

    // Redirect to the thank you page on the main website
    const siteUrl = Deno.env.get('SITE_URL');
    if (!siteUrl) {
      throw new Error('SITE_URL environment variable not configured');
    }

    // Validate SITE_URL is a valid HTTPS URL
    let validatedUrl: URL;
    try {
      validatedUrl = new URL(siteUrl);
      if (validatedUrl.protocol !== 'https:') {
        throw new Error('SITE_URL must use HTTPS protocol');
      }
      // Validate domain is from expected list
      const allowedDomains = ['sayings-unlocked.vercel.app', 'localhost'];
      const hostname = validatedUrl.hostname;
      if (!allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
        throw new Error('SITE_URL domain not in allowed list');
      }
    } catch (error) {
      console.error('Invalid SITE_URL:', error);
      throw new Error('Invalid SITE_URL configuration');
    }

    const redirectUrl = `${siteUrl}/feedback?type=${feedbackType}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  } catch (error: unknown) {
    console.error('Error in record-etymology-feedback function:', error);
    // Don't leak internal error details to users
    return new Response(
      JSON.stringify({ error: 'An internal error occurred while recording feedback' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
