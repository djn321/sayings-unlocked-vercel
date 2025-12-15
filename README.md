# Etymology Daily - Sayings Unlocked

Daily etymology lessons exploring the fascinating origins of common sayings and phrases. Users subscribe via email to receive AI-generated etymologies with historical context.

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (database, auth, edge functions)
- **AI**: Google Gemini 1.5 Flash (free tier)
- **Email**: Resend
- **Hosting**: Vercel

## Features

- Email subscription management
- Daily AI-generated etymology emails
- User feedback system (like/dislike)
- Admin panel for manual email triggers
- Feedback-based content improvement

## Local Development

### Prerequisites

- Node.js 18+ or Bun
- Supabase account
- Google AI API key (free)
- Resend API key

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd sayings-unlocked
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
# or
bun run dev
```

The app will be available at `http://localhost:8080`.

## Environment Variables

### Frontend (.env)
- `VITE_SUPABASE_PROJECT_ID` - Your Supabase project ID
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `VITE_SUPABASE_URL` - Your Supabase project URL

### Supabase Edge Functions
Set these in the Supabase dashboard under Settings > Edge Functions > Secrets:

- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for database operations)
- `GOOGLE_AI_API_KEY` - Google AI API key for Gemini (free tier)
- `RESEND_API_KEY` - Resend API key for sending emails
- `SUPABASE_URL` - Your Supabase project URL (for feedback links)

## Deployment

### Vercel Deployment

1. Push your code to GitHub

2. Import the repository in Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" > "Project"
   - Select your GitHub repository
   - Configure environment variables (VITE_* variables from .env)
   - Deploy

3. Vercel will automatically:
   - Detect Vite configuration
   - Build the project
   - Deploy to a production URL
   - Set up automatic deployments on git push

### Supabase Edge Functions

To deploy the edge functions to Supabase:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Deploy functions
supabase functions deploy send-daily-etymology
supabase functions deploy record-etymology-feedback
supabase functions deploy send-confirmation-email
supabase functions deploy confirm-subscription

# Set environment variables in Supabase dashboard
# Settings > Edge Functions > Secrets
```

## API Keys Setup

### Google AI API Key (Free)
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key
5. Add to Supabase edge function secrets as `GOOGLE_AI_API_KEY`

### Resend API Key
1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys
3. Create a new API key
4. Add to Supabase edge function secrets as `RESEND_API_KEY`
5. Verify your domain in Resend to send from your own domain

## Database Schema

The Supabase database includes:
- `subscribers` - Email subscribers and their status
- `etymology_sends` - History of sent etymologies
- `etymology_feedback` - User feedback (likes/dislikes)

Migrations are in `supabase/migrations/`.

## Admin Access

To grant admin access to a user:
1. Sign up through the app at `/auth`
2. In Supabase dashboard, add an entry to the admin table with the user's ID

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/     # React components
├── pages/          # Page components (routes)
├── hooks/          # Custom React hooks
├── integrations/   # Third-party integrations (Supabase)
└── lib/            # Utility functions

supabase/
├── functions/      # Edge functions
└── migrations/     # Database migrations
```

## Scheduled Email Sending

The cron job for sending daily etymology emails is automatically configured during database migrations. However, you need to verify the setup:

### Verifying the Cron Job

1. The migration `20251214000001_remove_cron_secrets_table.sql` creates a cron job that runs at 8:00 AM UTC daily
2. The cron job is configured to use the service role key from database settings

### Checking Cron Job Status

Use the verification script to check if the cron job is properly configured:

```bash
# View the verification script
cat scripts/verify-cron-job.sql

# Run it via Supabase dashboard SQL editor or CLI
```

### Important Configuration Notes

The cron job requires the following to be set up:

1. **Supabase Secrets** (set via `supabase secrets set`):
   - `SUPABASE_SERVICE_ROLE_KEY` - For database access
   - `SUPABASE_URL` - Your Supabase project URL
   - `GOOGLE_AI_API_KEY` - For AI-generated etymologies
   - `RESEND_API_KEY` - For sending emails
   - `SITE_URL` - Your frontend URL (e.g., https://sayings-unlocked.vercel.app)
   - `FEEDBACK_TOKEN_SECRET` - For signing feedback tokens

2. **Database Setting** (required for cron job authentication):
   - The cron job uses `current_setting('app.settings.service_role_key', true)` to authenticate
   - This setting must be configured in the database for the cron job to work
   - See `scripts/verify-cron-job.sql` for setup instructions

### Manual Trigger

To manually test the email sending function:

```bash
curl -X POST "https://vmsdalzjlkuilzcetztv.supabase.co/functions/v1/send-daily-etymology" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Note: This will send emails to all active subscribers!

### Alternative: External Cron Services

If you prefer not to use Supabase's built-in cron:
- GitHub Actions (free)
- EasyCron
- cron-job.org

## Cost Estimates

Based on 1000 subscribers:
- **Vercel**: Free (within limits)
- **Supabase**: Free tier covers most small projects
- **Google AI (Gemini)**: FREE (free tier covers 1,500 requests/day)
- **Resend**: Free tier covers 3000 emails/month

**Total cost: $0/month** (all services on free tier)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Create a pull request

## License

Private project
