import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  email: string;
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, token }: ConfirmationEmailRequest = await req.json();

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: "Email and token are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const confirmationUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/confirm?token=${token}`;

    const emailResponse = await resend.emails.send({
      from: "Etymology Daily <onboarding@resend.dev>",
      to: [email],
      subject: "Confirm your Etymology Daily subscription",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #9b87f5 0%, #D6BCFA 100%);
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .header h1 {
                color: white;
                margin: 0;
                font-size: 28px;
              }
              .content {
                background: #f8f9fa;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .button {
                display: inline-block;
                padding: 15px 30px;
                background: linear-gradient(135deg, #9b87f5 0%, #D6BCFA 100%);
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📚 Etymology Daily</h1>
            </div>
            <div class="content">
              <h2>Welcome to Etymology Daily!</h2>
              <p>Thank you for subscribing to our daily etymology newsletter. You're one step away from starting your journey through the fascinating history of words.</p>
              
              <p>Please confirm your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${confirmationUrl}" class="button">Confirm Subscription</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 14px;">${confirmationUrl}</p>
              
              <p>Once confirmed, you'll receive your first etymology email tomorrow morning!</p>
              
              <p>If you didn't subscribe to Etymology Daily, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>Etymology Daily - Discover the stories behind words</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
