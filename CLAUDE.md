# Etymology Daily - Sayings Unlocked (Vercel)

Daily etymology newsletter exploring the origins of common sayings and phrases. Users subscribe via email to receive AI-generated etymologies with historical context. **This is the current/active version** - see Notes below on the relationship to the older `sayings-unlocked` repo.

## Tech Stack

- Frontend: React + Vite + TypeScript, shadcn/ui + Tailwind CSS
- Backend: Supabase (database, auth, edge functions)
- AI: Google Gemini 1.5 Flash (free tier)
- Email: Resend
- Hosting: Vercel

## Structure

- `src/` - frontend application.
- `supabase/functions/` - `send-daily-etymology`, `send-confirmation-email`, `confirm-subscription`, `unsubscribe`, `record-etymology-feedback`, `setup-cron-auth`.
- `supabase/migrations/` - schema history.
- `scripts/` - `check-cron-job.ts`, `verify-cron-job.sql`, `generate-test.js`, `install-hooks.sh`.
- `tests/` - `edge-functions.test.ts`, `smoke-tests.sh`.

## GitHub

- Repo: https://github.com/djn321/sayings-unlocked-vercel (private)
- Deployed: live at https://sayings-unlocked.vercel.app

## Backlog

Tracked as GitHub Issues in this repo (previously in Linear, migrated 2026-09-10).

## Documentation

Project folder: `Software Projects/sayings-unlocked-vercel` in Nick's Obsidian vault.

## Web Services / External Accounts

| Service            | Role                | Account                |
| -------------------- | -------------------- | ------------------------ |
| Vercel                | Hosting               | GitHub (djn321)          |
| Supabase              | Backend / database    | GitHub (djn321)          |
| Resend                | Email delivery        | GitHub (djn321)          |
| Google Gemini API     | AI                     | nickjdillon@gmail.com    |
| Braintrust             | AI monitoring          | nick@productfuel.uk      |

## Known Issues

- **Occasional "Send Failed" alert: `Error fetching subscribers: { message: "Gateway Timeout" }`** - a transient Supabase gateway timeout on the subscribers query, not a code bug. Seen once (2026-09-12). If it recurs, just manually re-trigger `send-daily-etymology` (`workflow_dispatch` from the Actions tab, or curl - see README's Content Generation & Sending section) - it's safe to re-run same-day since the queue read is deterministic. Full write-up: `Technical/Gateway Timeout on Subscriber Fetch.md` in the Obsidian project folder. Worth adding a retry wrapper around the subscriber fetch if this starts happening regularly.

## Notes

- This started life as a fork/rebuild of the Lovable-based [sayings-unlocked](../sayings-unlocked) repo, moved onto a standalone Vercel + hand-written test suite setup. That repo was archived on 2026-09-01 in favour of this one.
- Has an actual test suite (`tests/`) - run these before shipping changes, unlike most of the other Lovable-originated projects in this dev folder.
