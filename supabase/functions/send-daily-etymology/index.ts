import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'npm:resend@4.0.0';
import { initLogger } from 'npm:braintrust';

const logger = initLogger({
  projectName: 'sayings-unlocked',
  apiKey: Deno.env.get('BRAINTRUST_API_KEY'),
  asyncFlush: false,
});

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

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1.0,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          saying: { type: 'string' },
          origin: { type: 'string' },
          meaning: { type: 'string' },
          era: { type: 'string' }
        },
        required: ['saying', 'origin', 'meaning', 'era']
      }
    }
  };

  // Try gemini-2.5-flash twice, then fall back to gemini-1.5-flash once
  const attempts = [
    { model: 'gemini-2.5-flash', delayMs: 0 },
    { model: 'gemini-2.5-flash', delayMs: 5000 },
    { model: 'gemini-1.5-flash', delayMs: 15000 },
  ];

  return await logger.traced(async (span) => {
    span.log({
      input: [{ role: 'user', content: prompt }],
      metadata: { model: 'gemini-2.5-flash', temperature: 1.0, maxOutputTokens: 2048 },
    });

    let lastError: Error | null = null;

    for (let i = 0; i < attempts.length; i++) {
      const { model, delayMs } = attempts[i];

      if (delayMs > 0) {
        console.log(`Waiting ${delayMs}ms before attempt ${i + 1}/${attempts.length}...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      console.log(`Gemini API attempt ${i + 1}/${attempts.length} using ${model}`);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isRetryable = [500, 502, 503, 429].includes(response.status);

        if (isRetryable && i < attempts.length - 1) {
          console.log(`Retryable error ${response.status} on ${model}, will retry...`);
          lastError = new Error(`Google AI API request failed: ${response.status} - ${errorText}`);
          continue;
        }
        throw new Error(`Google AI API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const finishReason = data.candidates[0].finishReason;
      console.log(`Gemini API finish reason (${model}):`, finishReason);

      if (finishReason === 'MAX_TOKENS' || finishReason === 'RECITATION') {
        if (i < attempts.length - 1) {
          console.log(`Retrying after ${finishReason} on ${model}...`);
          lastError = new Error(`Gemini API response truncated (${finishReason})`);
          continue;
        }
        throw new Error(`Gemini API response truncated (${finishReason}) after all attempts`);
      }

      if (!data.candidates[0].content?.parts?.[0]?.text) {
        console.error('No content in Gemini response:', JSON.stringify(data, null, 2));
        throw new Error('Gemini API returned no content');
      }

      const content = data.candidates[0].content.parts[0].text;
      console.log('Gemini response length:', content.length, 'characters');

      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      let etymology: Etymology;
      try {
        etymology = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Failed to parse JSON response from Gemini API');
        console.error('Raw content:', content);
        console.error('Cleaned content:', cleanContent);
        console.error('Parse error:', parseError);
        throw new Error(`Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      if (!etymology.saying || !etymology.origin || !etymology.meaning || !etymology.era) {
        console.error('Missing required fields in etymology:', etymology);
        throw new Error('Generated etymology is missing required fields');
      }

      console.log('Generated etymology:', etymology.saying);
      span.log({
        output: etymology,
        metadata: { model, finishReason, responseLength: content.length, attemptIndex: i },
      });

      return etymology;
    }

    throw lastError || new Error('Failed to generate etymology after all attempts');
  }, { name: 'generate-etymology', spanAttributes: { type: 'llm' } });
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

// Send failure notification email to admin
async function sendFailureNotification(errorMessage: string, context: string): Promise<void> {
  const adminEmail = 'test@nickdillon.uk';

  try {
    await resend.emails.send({
      from: 'Etymology Daily <sayings@padelcourtfinder.uk>',
      to: [adminEmail],
      subject: '⚠️ Etymology Daily - Send Failed',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 40px auto; padding: 24px; }
              .header { background: #dc2626; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0; }
              .content { background: #fef2f2; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #fecaca; }
              .error-box { background: white; padding: 16px; border-radius: 4px; font-family: monospace; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
              .timestamp { color: #6b7280; font-size: 14px; margin-top: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">Daily Etymology Send Failed</h2>
              </div>
              <div class="content">
                <p><strong>Context:</strong> ${context}</p>
                <p><strong>Error:</strong></p>
                <div class="error-box">${errorMessage}</div>
                <p class="timestamp">Occurred at: ${new Date().toISOString()}</p>
                <p>Please check the <a href="https://supabase.com/dashboard/project/vmsdalzjlkuilzcetztv/functions/send-daily-etymology/logs">Edge Function logs</a> for more details.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    console.log('Failure notification sent to admin');
  } catch (notifyError) {
    // Don't let notification failure mask the original error
    console.error('Failed to send failure notification:', notifyError);
  }
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify authorization - accept either service role key (for cron) or admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if this is a service role key request (used by cron jobs)
    // Note: SUPABASE_SERVICE_ROLE_KEY env var contains a different format (sb_secret_...),
    // so we use a custom secret with the actual JWT for cron auth comparison
    const cronServiceKey = Deno.env.get('SERVICE_ROLE_KEY_ACTUAL') || supabaseServiceKey;
    const isServiceRoleAuth = authHeader === `Bearer ${cronServiceKey}`;

    if (!isServiceRoleAuth) {
      // Fall back to admin user authentication for manual triggers
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: authHeader }
        }
      });

      // Get the authenticated user - pass JWT directly for server-side verification
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await userSupabase.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired authentication token' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check if user has admin role
      const { data: isAdmin, error: roleError } = await userSupabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (roleError || !isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized. Admin privileges required.' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    console.log(`Authentication: ${isServiceRoleAuth ? 'service role (cron)' : 'admin user'}`)

    // Use service role key for actual operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Get ALL previously sent sayings to avoid duplicates
    const { data: allSends } = await supabase
      .from('etymology_sends')
      .select('etymology_saying')
      .order('sent_at', { ascending: false });

    const allSentSayings = allSends?.map(e => e.etymology_saying.toLowerCase().trim()) || [];
    const allSentSayingsSet = new Set(allSentSayings);

    // Get feedback data from the last 30 days (for content guidance only)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: feedbackData } = await supabase
      .from('etymology_feedback')
      .select('etymology_saying, feedback_type')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const liked = feedbackData?.filter(f => f.feedback_type === 'like').map(f => f.etymology_saying) || [];
    const disliked = feedbackData?.filter(f => f.feedback_type === 'dislike').map(f => f.etymology_saying) || [];
    
    console.log(`Feedback context: ${liked.length} liked, ${disliked.length} disliked`);
    
    // Generate a new etymology using AI, with retry logic to avoid duplicates
    console.log('Generating new etymology with AI...');
    const maxRetries = 5;
    let etymology: Etymology | null = null;
    let attempts = 0;

    // Pass recent sayings to the AI for guidance (last 100 to keep prompt manageable)
    const recentForPrompt = allSends?.slice(0, 100).map(e => e.etymology_saying) || [];

    while (attempts < maxRetries) {
      attempts++;
      console.log(`Generation attempt ${attempts}/${maxRetries}`);

      const candidate = await generateEtymology(recentForPrompt, { liked, disliked });
      const candidateNormalised = candidate.saying.toLowerCase().trim();

      if (!allSentSayingsSet.has(candidateNormalised)) {
        etymology = candidate;
        console.log(`Generated unique saying: "${candidate.saying}"`);
        break;
      } else {
        console.log(`Duplicate detected: "${candidate.saying}" - retrying...`);
        // Add this to the prompt exclusion list for next attempt
        recentForPrompt.unshift(candidate.saying);
      }
    }

    if (!etymology) {
      throw new Error(`Failed to generate unique etymology after ${maxRetries} attempts. All generated sayings were duplicates.`);
    }

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

    // Send emails to all subscribers with rate limiting
    // Resend allows 2 requests/second, so we add 600ms delay between sends
    const results = [];
    const delayMs = 600; // 600ms = 1.67 requests/second (safely under 2/sec limit)

    for (const subscriber of subscribers) {
      try {
        const { error: emailError } = await resend.emails.send({
          from: 'Etymology Daily <sayings@padelcourtfinder.uk>',
          to: [subscriber.email],
          subject: `📚 Today's Etymology: "${etymology.saying}"`,
          html: await createEmailHtml(etymology, subscriber.id),
        });

        if (emailError) {
          console.error(`Error sending to ${subscriber.email}:`, emailError);
          results.push({ email: subscriber.email, success: false, error: emailError });
        } else {
          // Update last_sent_at timestamp
          await supabase
            .from('subscribers')
            .update({ last_sent_at: new Date().toISOString() })
            .eq('id', subscriber.id);

          console.log(`Successfully sent to ${subscriber.email}`);
          results.push({ email: subscriber.email, success: true });
        }
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        results.push({ email: subscriber.email, success: false, error });
      }

      // Add delay between sends to respect rate limit (except for the last one)
      if (subscriber !== subscribers[subscribers.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Email send complete. Success: ${successCount}, Failed: ${failCount}`);

    // Send notification if all emails failed
    if (successCount === 0 && subscribers.length > 0) {
      const failedEmails = results.filter(r => !r.success).map(r => r.email).join(', ');
      await sendFailureNotification(
        `All ${failCount} email(s) failed to send. Failed recipients: ${failedEmails}`,
        'Email sending completed but all sends failed'
      );
    }

    await logger.flush();
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

    // Send failure notification to admin
    const errorMessage = error instanceof Error ? error.message : String(error);
    await sendFailureNotification(errorMessage, 'Function threw an exception during execution');

    await logger.flush();
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
