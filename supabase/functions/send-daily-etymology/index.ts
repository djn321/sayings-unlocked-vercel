import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Etymology {
  saying: string;
  origin: string;
  meaning: string;
  era: string;
}

const etymologies: Etymology[] = [
  {
    saying: "Spill the beans",
    origin: "In ancient Greece, black and white beans were used for voting. Black beans meant 'no' and white beans meant 'yes.' If someone accidentally spilled the beans before voting was complete, they would reveal the outcome prematurely.",
    meaning: "To reveal a secret or disclose information that was meant to be kept private.",
    era: "Ancient Greece"
  },
  {
    saying: "Bite the bullet",
    origin: "Before anesthesia, patients undergoing surgery would bite on a bullet or leather strap to help them endure the pain. This practice was especially common during wartime when medical supplies were scarce.",
    meaning: "To endure a painful or difficult situation with courage and determination.",
    era: "19th Century"
  },
  {
    saying: "Cat's out of the bag",
    origin: "In medieval markets, unscrupulous merchants would sometimes sell customers a cat in a bag, claiming it was a pig. When the buyer opened the bag at home, the cat would escape, revealing the deception.",
    meaning: "A secret has been revealed, often accidentally or prematurely.",
    era: "Medieval Times"
  },
  {
    saying: "Break the ice",
    origin: "In the days before modern icebreakers, small ships had to break through frozen waters to allow larger ships to pass. The first ship to venture through was 'breaking the ice' for others to follow.",
    meaning: "To initiate conversation or ease tension in a social situation.",
    era: "16th Century"
  },
  {
    saying: "Turn a blind eye",
    origin: "Admiral Horatio Nelson, who was blind in one eye, allegedly held his telescope to his blind eye during the Battle of Copenhagen when his superior signaled him to withdraw, claiming he couldn't see the signal.",
    meaning: "To deliberately ignore something wrong or unpleasant.",
    era: "1801"
  }
];

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

function getRandomEtymology(): Etymology {
  return etymologies[Math.floor(Math.random() * etymologies.length)];
}

function createEmailHtml(etymology: Etymology): string {
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
          <div class="footer">
            <p>Etymology Daily - Bringing the stories of language to life</p>
            <p>You're receiving this because you subscribed to our daily etymology emails.</p>
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

    // Get random etymology for today
    const etymology = getRandomEtymology();
    console.log(`Selected etymology: "${etymology.saying}"`);

    // Send emails to all subscribers
    const emailPromises = subscribers.map(async (subscriber) => {
      try {
        const { error: emailError } = await resend.emails.send({
          from: 'Etymology Daily <onboarding@resend.dev>',
          to: [subscriber.email],
          subject: `📚 Today's Etymology: "${etymology.saying}"`,
          html: createEmailHtml(etymology),
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
  } catch (error: any) {
    console.error('Error in send-daily-etymology function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
