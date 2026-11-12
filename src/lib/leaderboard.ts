import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
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

  const scoredEvents = events ?? [];
  const totals = new Map<string, number>();

  if (scoredEvents.length > 0) {
    const predictions = await fetchAllRows<{
      user_id: string;
      event_id: string;
      selected_option: string;
      is_locked: boolean;
    }>((from, to) =>
      supabase
        .from("predictions")
        .select("user_id, event_id, selected_option, is_locked")
        .in(
          "event_id",
          scoredEvents.map((event) => event.id),
        )
        .order("id")
        .range(from, to),
    );

    const predictionsByEvent = new Map<
      string,
      { user_id: string; selected_option: string; is_locked: boolean }[]
    >();
    for (const prediction of predictions) {
      const list = predictionsByEvent.get(prediction.event_id) ?? [];
      list.push(prediction);
      predictionsByEvent.set(prediction.event_id, list);
    }

    for (const event of scoredEvents) {
      const scored = calculateEventPoints(
        predictionsByEvent.get(event.id) ?? [],
        event.correct_answer,
      );

      for (const { user_id, points } of scored) {
        totals.set(user_id, (totals.get(user_id) ?? 0) + points);
      }
    }
  }

  const allUsers = await fetchAllRows<{ id: string }>((from, to) =>
    supabase.from("users").select("id").order("id").range(from, to),
  );

  const rows = allUsers.map((user) => ({
    user_id: user.id,
    total_points: Math.round((totals.get(user.id) ?? 0) * 100) / 100,
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
