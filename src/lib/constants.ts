export const POINTS_PER_EVENT = 100;

/**
 * Maximum number of predictions a user may nominate as a "Lock" (a
 * double-point pick).
 *
 * IMPORTANT: this value is duplicated as the `max_locks` constant in the
 * `predictions_max_locks` trigger function in
 * `supabase/migrations/0004_prediction_locks.sql` (Postgres triggers can't
 * read application constants). Update both if you change the limit.
 */
export const MAX_LOCKS = 3;

/** Multiplier applied to a correct prediction that the user locked. */
export const LOCK_MULTIPLIER = 2;
