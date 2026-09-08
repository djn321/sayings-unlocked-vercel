# Etymology Daily - Sayings Unlocked

Daily etymology lessons exploring the fascinating origins of common sayings and phrases. Users subscribe via email to receive AI-generated etymologies with historical context.

Etymologies are generated in bulk ahead of time and stored in a queue, rather than being generated on demand each day - see [Content Generation & Sending](#content-generation--sending) below.

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
- `RESEND_API_KEY` - Resend API key for sending emails
- `SUPABASE_URL` - Your Supabase project URL (for feedback links)
- `SERVICE_ROLE_KEY_ACTUAL` - shared secret used by the GitHub Actions cron workflows to authenticate (see [Content Generation & Sending](#content-generation--sending))
- `FEEDBACK_TOKEN_SECRET` - for signing per-subscriber feedback/unsubscribe links

Only needed by `generate-etymology-batch` (not the daily send function):
- `GOOGLE_AI_API_KEY` - Google AI API key for Gemini (free tier)
- `BRAINTRUST_API_KEY` - optional, for LLM call tracing

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
supabase functions deploy generate-etymology-batch
supabase functions deploy record-etymology-feedback
supabase functions deploy send-confirmation-email
supabase functions deploy confirm-subscription

# Set environment variables in Supabase dashboard
# Settings > Edge Functions > Secrets
```

In CI, this happens automatically via `.github/workflows/deploy-supabase.yml` on push to `main`.

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
- `etymology_queue` - Pre-generated etymologies, append-only, consumed deterministically by date (see below)
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

## Content Generation & Sending

Generation and sending are decoupled, so a Gemini outage on any given day can't take down that day's email:

- **`generate-etymology-batch`** runs weekly and tops up `etymology_queue` with enough pre-generated etymologies to keep a 21-day buffer ahead of today. It's the only function that calls Gemini.
- **`send-daily-etymology`** runs daily and deterministically picks "today's" row from `etymology_queue` by date (no Gemini call, nothing that can be "overloaded" at send time) and emails it to all active subscribers.

Both are triggered by GitHub Actions cron (`.github/workflows/send-daily-etymology.yml` and `.github/workflows/generate-etymology-batch.yml`), not Supabase's `pg_cron` - this avoids the recurring cron-auth/secret-storage setup pain of pg_cron.

### Setting up the GitHub Actions cron

1. Add a repo secret `SUPABASE_CRON_SECRET` (Settings → Secrets and variables → Actions) with the same value as the `SERVICE_ROLE_KEY_ACTUAL` edge function secret.
2. The workflows run automatically on their schedules (`5 8 * * *` daily, `0 6 * * 0` weekly). You can also trigger either manually from the Actions tab (`workflow_dispatch`).

### Manual Trigger

To manually test either function:

```bash
curl -X POST "https://vmsdalzjlkuilzcetztv.supabase.co/functions/v1/send-daily-etymology" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -X POST "https://vmsdalzjlkuilzcetztv.supabase.co/functions/v1/generate-etymology-batch" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Note: `send-daily-etymology` will send emails to all active subscribers! It's safe to re-trigger on the same day though - it always resolves to the same pre-generated saying, so subscribers won't get sent two different emails.

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
