import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const ADMIN_EMAIL = 'test@nickdillon.uk';

// Sends an admin alert email. Failures here are logged but never thrown -
// a broken notification must not mask the original error/condition.
export async function sendAdminAlert(subject: string, context: string, details: string): Promise<void> {
  try {
    await resend.emails.send({
      from: 'Etymology Daily <sayings@padelcourtfinder.uk>',
      to: [ADMIN_EMAIL],
      subject,
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
              .details-box { background: white; padding: 16px; border-radius: 4px; font-family: monospace; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
              .timestamp { color: #6b7280; font-size: 14px; margin-top: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">${subject}</h2>
              </div>
              <div class="content">
                <p><strong>Context:</strong> ${context}</p>
                <p><strong>Details:</strong></p>
                <div class="details-box">${details}</div>
                <p class="timestamp">Occurred at: ${new Date().toISOString()}</p>
                <p>Check the <a href="https://supabase.com/dashboard/project/vmsdalzjlkuilzcetztv/functions">Edge Function logs</a> for more details.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    console.log('Admin alert sent:', subject);
  } catch (notifyError) {
    console.error('Failed to send admin alert:', notifyError);
  }
}
