import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    if (!subscriberId || !saying || !feedbackType) {
      return new Response('Missing required parameters', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    if (feedbackType !== 'like' && feedbackType !== 'dislike') {
      return new Response('Invalid feedback type', { 
        status: 400,
        headers: corsHeaders 
      });
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

    // Return a nice thank you page
    const thankYouHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 48px 32px;
              text-align: center;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 500px;
            }
            h1 {
              color: #d97706;
              font-size: 32px;
              margin-bottom: 16px;
            }
            p {
              color: #44403c;
              font-size: 18px;
              line-height: 1.6;
            }
            .emoji {
              font-size: 64px;
              margin-bottom: 24px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="emoji">${feedbackType === 'like' ? '👍' : '👎'}</div>
            <h1>Thank you for your feedback!</h1>
            <p>Your feedback helps us improve the etymologies we send you.</p>
          </div>
        </body>
      </html>
    `;

    return new Response(thankYouHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
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
