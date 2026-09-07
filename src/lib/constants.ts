/**
 * Submission deadline for the Rat Race competition. Predictions cannot be
 * submitted or edited after this date/time (also manually enforced by
 * locking events via the admin panel).
 *
 * IMPORTANT: this value is duplicated as a literal timestamp in the
 * `predictions` insert/update RLS policies in
 * `supabase/migrations/0001_init.sql` (Postgres RLS policies can't read
 * application constants). If you change the deadline here, update both
 * policies in that migration file to match.
 */
export const SUBMISSION_DEADLINE = new Date("2026-09-20T23:59:59+10:00");

export const POINTS_PER_EVENT = 100;
