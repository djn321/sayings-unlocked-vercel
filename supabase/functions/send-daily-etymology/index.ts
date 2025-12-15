import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'npm:resend@4.0.0';

// Get CORS origin - use environment variable or fallback for development
const getCorsOrigin = () => {
  return Deno.env.get('SITE_URL') || 'https://sayings-unlocked.vercel.app';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getCorsOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Etymology {
  saying: string;
  origin: string;
  meaning: string;
  era: string;
}

async function generateEtymology(recentSayings: string[], feedbackData: { liked: string[], disliked: string[] }): Promise<Etymology> {
  const geminiApiKey = Deno.env.get('GOOGLE_AI_API_KEY');

  const recentList = recentSayings.length > 0
    ? `\n\nDo NOT use any of these recently used sayings: ${recentSayings.join(', ')}`
    : '';

  const feedbackContext = feedbackData.liked.length > 0 || feedbackData.disliked.length > 0
    ? `\n\nBased on subscriber feedback:
${feedbackData.liked.length > 0 ? `- These sayings were LIKED (generate more like these): ${feedbackData.liked.join(', ')}` : ''}
${feedbackData.disliked.length > 0 ? `- These sayings were DISLIKED (avoid similar ones): ${feedbackData.disliked.join(', ')}` : ''}`
    : '';

  const prompt = `Generate a fascinating etymology for a common English saying or phrase.

Requirements:
- Choose a well-known saying or idiom that people use regularly
- The origin story should be historically accurate and interesting
- Include the time period or era when it originated
- Explain what the saying means in modern usage
${recentList}${feedbackContext}

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "saying": "the exact saying or phrase",
  "origin": "detailed historical origin story (2-3 sentences)",
  "meaning": "modern meaning and usage (1-2 sentences)",
  "era": "time period (e.g., '16th Century', 'Ancient Rome', '1800s')"
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 1024,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google AI API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;

  // Remove markdown code blocks if present
  const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const etymology = JSON.parse(cleanContent);

  console.log('Generated etymology:', etymology.saying);
  return etymology;
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

// Generate HMAC-signed token for feedback URLs
async function generateFeedbackToken(subscriberId: string, saying: string): Promise<string> {
  const secretKey = Deno.env.get('FEEDBACK_TOKEN_SECRET');
  if (!secretKey) {
    throw new Error('FEEDBACK_TOKEN_SECRET not configured');
  }

  const timestamp = Date.now().toString();
  const message = `${subscriberId}.${timestamp}.${saying}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${subscriberId}.${timestamp}.${signatureBase64}`;
}

// Generate HMAC-signed token for unsubscribe URLs
async function generateUnsubscribeToken(subscriberId: string): Promise<string> {
  const secretKey = Deno.env.get('FEEDBACK_TOKEN_SECRET');
  if (!secretKey) {
    throw new Error('FEEDBACK_TOKEN_SECRET not configured');
  }

  const timestamp = Date.now().toString();
  const message = `${subscriberId}.${timestamp}.unsubscribe`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${subscriberId}.${timestamp}.${signatureBase64}`;
}

async function createEmailHtml(etymology: Etymology, subscriberId: string): Promise<string> {
  const feedbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/record-etymology-feedback`;
  const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/unsubscribe`;

  const feedbackToken = await generateFeedbackToken(subscriberId, etymology.saying);
  const unsubscribeToken = await generateUnsubscribeToken(subscriberId);

  const likeUrl = `${feedbackUrl}?token=${encodeURIComponent(feedbackToken)}&saying=${encodeURIComponent(etymology.saying)}&feedback=like`;
  const dislikeUrl = `${feedbackUrl}?token=${encodeURIComponent(feedbackToken)}&saying=${encodeURIComponent(etymology.saying)}&feedback=dislike`;
  const unsubscribe = `${unsubscribeUrl}?token=${encodeURIComponent(unsubscribeToken)}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
            color: white;
            padding: 32px 24px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .content {
            padding: 32px 24px;
            background: white;
          }
          .saying {
            font-size: 24px;
            font-weight: 700;
            color: #d97706;
            margin-bottom: 16px;
            text-align: center;
          }
          .era-badge {
            display: inline-block;
            background: #fef3c7;
            color: #d97706;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 16px;
          }
          .section {
            margin-bottom: 24px;
          }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #78716c;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .section-content {
            color: #44403c;
            line-height: 1.8;
          }
          .footer {
            text-align: center;
            padding: 24px;
            font-size: 12px;
            color: #78716c;
            background: #fafaf9;
          }
          .unsubscribe {
            color: #d97706;
            text-decoration: none;
          }
          .feedback-section {
            text-align: center;
            padding: 24px;
            background: #fafaf9;
            border-top: 1px solid #e7e5e4;
          }
          .feedback-title {
            font-size: 14px;
            font-weight: 600;
            color: #44403c;
            margin-bottom: 12px;
          }
          .feedback-buttons {
            display: flex;
            gap: 12px;
            justify-content: center;
          }
          .feedback-button {
            display: inline-block;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s;
          }
          .feedback-button.like {
            background: #22c55e;
            color: white;
          }
          .feedback-button.like:hover {
            background: #16a34a;
          }
          .feedback-button.dislike {
            background: #ef4444;
            color: white;
          }
          .feedback-button.dislike:hover {
            background: #dc2626;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 Etymology Daily</h1>
          </div>
          <div class="content">
            <div style="text-align: center;">
              <span class="era-badge">${etymology.era}</span>
            </div>
            <div class="saying">"${etymology.saying}"</div>
            
            <div class="section">
              <div class="section-title">The Origin</div>
              <div class="section-content">${etymology.origin}</div>
            </div>
            
            <div class="section">
              <div class="section-title">Modern Meaning</div>
              <div class="section-content">${etymology.meaning}</div>
            </div>
          </div>
          <div class="feedback-section">
            <div class="feedback-title">Did you enjoy today's etymology?</div>
            <div class="feedback-buttons">
              <a href="${likeUrl}" class="feedback-button like">👍 I liked it</a>
              <a href="${dislikeUrl}" class="feedback-button dislike">👎 Not my favorite</a>
            </div>
          </div>
          <div class="footer">
            <p>Etymology Daily - Bringing the stories of language to life</p>
            <p>You're receiving this because you subscribed to our daily etymology emails.</p>
            <p><a href="${unsubscribe}" class="unsubscribe">Unsubscribe from daily etymologies</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily etymology email send...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active subscribers
    const { data: subscribers, error: fetchError } = await supabase
      .from('subscribers')
      .select('id, email')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching subscribers:', fetchError);
      throw fetchError;
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('No active subscribers found');
      return new Response(
        JSON.stringify({ message: 'No active subscribers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscribers.length} active subscribers`);

    // Get recently sent sayings (last 30 days) to avoid duplicates
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentSends } = await supabase
      .from('etymology_sends')
      .select('etymology_saying')
      .gte('sent_at', thirtyDaysAgo.toISOString())
      .order('sent_at', { ascending: false });

    const recentSayings = recentSends?.map(e => e.etymology_saying) || [];
    
    // Get feedback data from the last 30 days
    const { data: feedbackData } = await supabase
      .from('etymology_feedback')
      .select('etymology_saying, feedback_type')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const liked = feedbackData?.filter(f => f.feedback_type === 'like').map(f => f.etymology_saying) || [];
    const disliked = feedbackData?.filter(f => f.feedback_type === 'dislike').map(f => f.etymology_saying) || [];
    
    console.log(`Feedback context: ${liked.length} liked, ${disliked.length} disliked`);
    
    // Generate a new etymology using AI
    console.log('Generating new etymology with AI...');
    const etymology = await generateEtymology(recentSayings, { liked, disliked });

    // Get the current cycle number
    const { data: cycleData } = await supabase.rpc('get_current_etymology_cycle');
    const currentCycle = cycleData || 1;

    // Record this etymology as sent
    await supabase
      .from('etymology_sends')
      .insert({
        etymology_saying: etymology.saying,
        cycle_number: currentCycle
      });

    // Send emails to all subscribers
    const emailPromises = subscribers.map(async (subscriber) => {
      try {
        const { error: emailError } = await resend.emails.send({
          from: 'Etymology Daily <onboarding@resend.dev>',
          to: [subscriber.email],
          subject: `📚 Today's Etymology: "${etymology.saying}"`,
          html: await createEmailHtml(etymology, subscriber.id),
        });

        if (emailError) {
          console.error(`Error sending to ${subscriber.email}:`, emailError);
          return { email: subscriber.email, success: false, error: emailError };
        }

        // Update last_sent_at timestamp
        await supabase
          .from('subscribers')
          .update({ last_sent_at: new Date().toISOString() })
          .eq('id', subscriber.id);

        console.log(`Successfully sent to ${subscriber.email}`);
        return { email: subscriber.email, success: true };
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        return { email: subscriber.email, success: false, error };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Email send complete. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        message: 'Daily etymology emails sent',
        etymology: etymology.saying,
        total: subscribers.length,
        success: successCount,
        failed: failCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error in send-daily-etymology function:', error);
    // Don't leak internal error details to users
    return new Response(
      JSON.stringify({ error: 'An internal error occurred while sending daily etymology' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
