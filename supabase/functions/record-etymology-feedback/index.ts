import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://sayings-unlocked.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const subscriberId = url.searchParams.get('subscriber_id');
    const saying = url.searchParams.get('saying');
    const feedbackType = url.searchParams.get('feedback');

    console.log('Feedback request:', { subscriberId, saying, feedbackType });

    // Validate inputs
    if (!subscriberId || !saying || !feedbackType) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate UUID format for subscriber_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(subscriberId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscriber_id format' }),
        {
          status: 400,
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
    const siteUrl = Deno.env.get('SITE_URL') || 'https://fviryuzkiolzixezvnvq.lovable.app';
    const redirectUrl = `${siteUrl}/feedback?type=${feedbackType}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  } catch (error: any) {
    console.error('Error in record-etymology-feedback function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
