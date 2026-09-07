# Rat Race

Rat Race competition web app - predict sports event winners and compete on the leaderboard.

Participants sign up, predict the winner of 60+ sports events across AFL, Cricket, American
Football, Basketball, Baseball, Ice Hockey, Soccer, Rugby League, Rugby Union, Tennis, Golf and
more, and compete on a live leaderboard. Each event is worth 100 points, split equally among
everyone who picks the correct winner. Submissions close **20 September 2026**.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, strict mode) + [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) (PostgreSQL, Auth, Realtime)
- Deployed on [Vercel](https://vercel.com)

## Getting started

1. **Create a Supabase project** and run the SQL in
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) via the SQL editor
   (or `supabase db push` if you use the Supabase CLI). This creates the `users`, `events`,
   `predictions` and `leaderboard` tables, Row Level Security policies, and seeds all 64 events.
2. **Copy `.env.example` to `.env.local`** and fill in your Supabase project URL, anon key,
   service role key, and a secret `ADMIN_KEY` of your choosing.
3. **Install dependencies and run the dev server:**

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

## Admin panel

Visit `/admin` and enter the `ADMIN_KEY` you configured. From there you can:

- Lock or unlock individual events to stop/allow further predictions.
- Enter the correct answer for an event, which locks it and automatically recalculates the
  leaderboard (100 points split equally among everyone who predicted correctly).
- Manually trigger a full leaderboard recalculation.

## Project structure

- `src/app` – Next.js App Router pages (`/`, `/signup`, `/login`, `/predict`, `/leaderboard`,
  `/admin`) and admin API routes (`/api/admin/*`).
- `src/data/events.ts` – the master list of events and dropdown options (also used to generate
  the SQL seed data).
- `src/lib` – Supabase client helpers, points calculation, and leaderboard recalculation logic.
- `src/types/database.ts` – shared TypeScript types for events, users, predictions and the
  leaderboard.
- `supabase/migrations/0001_init.sql` – database schema, RLS policies and seed data.
