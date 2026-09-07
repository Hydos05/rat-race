import { createAdminClient } from "@/lib/supabase/admin";
import { calculateEventPoints } from "@/lib/scoring";

/**
 * Recomputes the entire leaderboard from scratch based on every event that
 * currently has a `correct_answer` set. This keeps the leaderboard in sync
 * even if an admin corrects a previously-entered answer.
 */
export async function recalculateLeaderboard() {
  const supabase = createAdminClient();

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, correct_answer")
    .not("correct_answer", "is", null);

  if (eventsError) throw eventsError;

  const totals = new Map<string, number>();

  for (const event of events ?? []) {
    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("user_id, selected_option")
      .eq("event_id", event.id);

    if (predictionsError) throw predictionsError;

    const scored = calculateEventPoints(predictions ?? [], event.correct_answer);

    for (const { user_id, points } of scored) {
      totals.set(user_id, (totals.get(user_id) ?? 0) + points);
    }
  }

  const { data: allUsers, error: usersError } = await supabase.from("users").select("id");
  if (usersError) throw usersError;

  const rows = (allUsers ?? []).map((user) => ({
    user_id: user.id,
    total_points: totals.get(user.id) ?? 0,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("leaderboard")
      .upsert(rows, { onConflict: "user_id" });

    if (upsertError) throw upsertError;
  }

  return rows.length;
}
