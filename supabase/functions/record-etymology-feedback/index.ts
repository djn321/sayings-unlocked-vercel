import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const siteUrl = Deno.env.get('SITE_URL');
if (!siteUrl) {
  throw new Error('SITE_URL environment variable must be configured');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': siteUrl,
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

    // Check if token is expired (valid for 7 days)
    const tokenTime = parseInt(timestamp);
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (now - tokenTime > sevenDays) {
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

    console.log('Feedback request:', { token: token ? 'present' : 'missing', saying, feedbackType });

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

    // Validate saying length
    if (saying.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Saying text too long' }),
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
    const { data: existingFeedback } = await supabase
      .from('etymology_feedback')
      .select('id')
      .eq('subscriber_id', subscriberId)
      .eq('etymology_saying', saying)
      .single();

    if (existingFeedback) {
      // Update existing feedback
      const { error: updateError } = await supabase
        .from('etymology_feedback')
        .update({ feedback_type: feedbackType })
        .eq('id', existingFeedback.id);

      if (updateError) {
        console.error('Error updating feedback:', updateError);
        throw updateError;
      }

      console.log(`Updated feedback for subscriber ${subscriberId}`);
    } else {
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
    }

    // Redirect to the thank you page on the main website
    const siteUrl = Deno.env.get('SITE_URL');
    if (!siteUrl) {
      throw new Error('SITE_URL environment variable not configured');
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
