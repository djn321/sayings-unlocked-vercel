# Etymology Daily - Sayings Unlocked

Daily etymology lessons exploring the fascinating origins of common sayings and phrases. Users subscribe via email to receive AI-generated etymologies with historical context.

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (database, auth, edge functions)
- **AI**: Anthropic Claude 3.5 Sonnet
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
- Anthropic API key
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
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude
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

### Anthropic API Key
1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Go to Settings > API Keys
3. Create a new API key
4. Add to Supabase edge function secrets as `ANTHROPIC_API_KEY`

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

Set up a cron job to trigger the send-daily-etymology function daily:

1. In Supabase dashboard, go to Database > Cron Jobs
2. Create a new cron job:
```sql
SELECT cron.schedule(
  'send-daily-etymology',
  '0 9 * * *',  -- 9 AM daily
  $$
  SELECT net.http_post(
    url := 'https://your-project-id.supabase.co/functions/v1/send-daily-etymology',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

Or use an external service like:
- GitHub Actions (free)
- EasyCron
- cron-job.org

## Cost Estimates

Based on 1000 subscribers:
- **Vercel**: Free (within limits)
- **Supabase**: Free tier covers most small projects
- **Anthropic API**: ~$3-5/month (1 etymology per day)
- **Resend**: Free tier covers 3000 emails/month

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Create a pull request

## License

Private project
