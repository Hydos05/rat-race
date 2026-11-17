# Rat Race

Rat Race competition web app - predict sports event winners and compete on the leaderboard.

Participants sign up, predict the winner of 60+ sports events across AFL, Cricket, American
Football, College Football, Basketball, Baseball, Ice Hockey, Soccer, Rugby League, Rugby Union,
Tennis, Golf and more, and compete on a live leaderboard. Each event is worth 100 points, split
equally among everyone who picks the correct winner. Each player can also nominate up to three
predictions as **Locks**, which pay double points if they come in. Submissions remain open
until an administrator closes them. Locks are unavailable for AFC Champion, NFC Champion,
Super Bowl winner, NFL MVP, Offensive Player of the Year, Defensive Player of the Year,
College Football Playoff Champion and Heisman Trophy. Predictions for these events are still allowed.
Signed-in participants can see everyone's saved picks, grouped by event category, on the
**Everyone's picks** page. Picks are visible while submissions remain open.
Use the slider at the bottom of the screen to scroll across the picks table.
Each saved pick shows its potential points if correct, including locks, rounded to whole points;
actual leaderboard scores use two decimal places. Potential values change when participants change picks.
Cell colours indicate the rounded potential value in ten-point bands; the colour key appears above the table.
The leaderboard displays actual points / total possible points. Total possible is actual points
plus the potential value of saved picks for events without a result, including locks. Reload the
page for current values. Possible totals are rounded for display; rankings use unrounded totals
and are sorted by actual points, then total possible points.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, strict mode) + [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) (PostgreSQL, Auth, Realtime)
- Deployed on [Vercel](https://vercel.com)

## Getting started

1. **Create a Supabase project** and run the SQL in
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) via the SQL editor
   (or `supabase db push` if you use the Supabase CLI). This creates the `users`, `events`,
   `predictions` and `leaderboard` tables, Row Level Security policies, and seeds all 62 events.
   Run all later migration files in order, including for an existing database. Migration
   `0005_submission_settings.sql` reopens submissions without changing existing predictions or
   individual event locks; apply it before deploying the updated app.
2. **Copy `.env.example` to `.env.local`** and fill in your Supabase project URL, anon key,
   service role key, and a secret `ADMIN_KEY` of your choosing.
3. **Disable email confirmation** so new sign-ups can log in immediately (recommended, since
   confirmation emails are often blocked by mail servers): in the Supabase dashboard go to
   **Authentication → Providers → Email** and toggle **Confirm email** to **OFF**. The sign-up
   form already handles both cases (it logs the user in immediately when a session is returned,
   or shows a "You can now log in" message otherwise), so no code changes are required after
   toggling this setting.
4. **Install dependencies and run the dev server:**

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Deploying

1. Push this repository to GitHub and import it into [Vercel](https://vercel.com).
2. Add the environment variables from `.env.example` to your Vercel project (Project Settings ->
   Environment Variables). `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are
   used by the browser; `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_KEY` must **not** be prefixed with
   `NEXT_PUBLIC_` since they are server-only secrets used by the `/admin` API routes.
3. Deploy. Vercel will rebuild automatically on every push.

## Password recovery

Add `https://<your-app-domain>/auth/reset-password` to Supabase **Authentication → URL
Configuration → Redirect URLs** for each deployed domain (and
`http://localhost:3000/auth/reset-password` for local development). Ensure Supabase email
delivery is configured and the reset email template uses `{{ .ConfirmationURL }}`. The user
must open the email link in the same browser and device used to request it, because the
recovery flow uses PKCE. The built-in Supabase email service has delivery and rate limits;
configure custom SMTP for production if needed.

## Admin panel

Visit `/admin` and enter the `ADMIN_KEY` you configured. From there you can:

- Lock or unlock individual events to stop/allow further predictions.
- Open or close submissions for all participants. Individual event locks still apply, and
  participants with the prediction form already open should refresh to see the current status.
- Enter the correct answer for an event, which locks it and automatically recalculates the
  leaderboard (100 points split equally among everyone who predicted correctly).
- Manually trigger a full leaderboard recalculation.
- Use **View predictions** to review every player's picks, including which ones they locked.
  Select the plus box beside a player to expand their picks, or the minus box to collapse them.
- Tick **Fees paid** beside a user to record payment, or untick it to correct a mistake.
  Payment status is saved across refreshes and is accessible only through the admin API.
- Expand a user under **View predictions** and select **Reset password** to set a temporary
  password without email. Check the displayed email, share the password securely, and ask the
  participant to sign in and change it at `/reset-password`. This does not force a password
  change or guarantee that existing sessions are immediately signed out.
- Follow the **Edit event options** link to `/admin/edit-events`, where you can edit each event's
  dropdown options (one option per line, add/remove/reorder freely), or restore an event's
  original options with **Reset to defaults**. Changes are saved immediately via
  `POST /api/admin/update-event-options` and appear the next time the prediction form loads.

## Project structure

- `src/app` – Next.js App Router pages (`/`, `/signup`, `/login`, `/predict`, `/leaderboard`,
  `/admin`, `/admin/edit-events`), admin API routes (`/api/admin/*`) and the player
  `POST /api/predictions/update-lock` route used by the Lock toggles.
- `src/data/events.ts` – the master list of events and dropdown options (also used to generate
  the SQL seed data).
- `src/lib` – Supabase client helpers, points calculation, and leaderboard recalculation logic.
- `src/types/database.ts` – shared TypeScript types for events, users, predictions and the
  leaderboard.
- `supabase/migrations/0001_init.sql` – database schema, RLS policies and seed data.
- `supabase/migrations/0002_remove_other_option.sql` – removes duplicate `"Other"` options from
  existing events.
- `supabase/migrations/0003_replace_2027_events.sql` – replaces five events with Heisman Trophy,
  Serie A Champion and La Liga Champion.
- `supabase/migrations/0004_prediction_locks.sql` – adds `predictions.is_locked` and the trigger
  enforcing a maximum of three Locks per user.
- `supabase/migrations/0005_submission_settings.sql` – reopens submissions and adds an admin-controlled
  setting enforced by prediction RLS policies.
- `supabase/migrations/0006_restrict_prediction_locks.sql` – clears existing locks once, excludes
  eight events from locks, and recalculates the leaderboard. Run it before deploying the updated app;
  do not rerun it after players have chosen new locks. Players should refresh an already open form.
- `supabase/migrations/0007_entry_fees.sql` – adds admin-only payment status storage.
  Apply this migration before deploying the fee checkboxes.
- `supabase/migrations/0008_fix_lock_upserts.sql` – fixes saving existing locked picks
  when all three locks are used. Apply in Supabase; it changes only the lock-limit
  function and preserves all predictions and locks.
