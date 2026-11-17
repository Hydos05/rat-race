import { LOCK_MULTIPLIER, POINTS_PER_EVENT } from "@/lib/constants";

export interface ScoredPrediction {
  user_id: string;
  points: number;
}

export function normaliseAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

export function calculatePointsPerPrediction(sharingCount: number, isLocked: boolean): number {
  return Math.round((POINTS_PER_EVENT / sharingCount) * (isLocked ? LOCK_MULTIPLIER : 1) * 100) / 100;
}

export function groupPredictionsByEventAndAnswer<T extends { event_id: string; selected_option: string }>(
  predictions: T[],
): Map<string, Map<string, T[]>> {
  const grouped = new Map<string, Map<string, T[]>>();
  for (const prediction of predictions) {
    const eventPicks = grouped.get(prediction.event_id) ?? new Map<string, T[]>();
    const answer = normaliseAnswer(prediction.selected_option);
    const matches = eventPicks.get(answer) ?? [];
    matches.push(prediction);
    eventPicks.set(answer, matches);
    grouped.set(prediction.event_id, eventPicks);
  }
  return grouped;
}

export function calculateRemainingPoints(
  events: { id: string; correct_answer: string | null }[],
  predictions: { user_id: string; event_id: string; selected_option: string; is_locked: boolean }[],
): Map<string, number> {
  const openEvents = new Set(events.filter((event) => !event.correct_answer).map((event) => event.id));
  const groups = groupPredictionsByEventAndAnswer(
    predictions.filter((prediction) => openEvents.has(prediction.event_id)),
  );
  const cents = new Map<string, number>();
  for (const eventGroups of groups.values()) {
    for (const group of eventGroups.values()) {
      for (const prediction of group) {
        const points = calculatePointsPerPrediction(group.length, prediction.is_locked);
        cents.set(prediction.user_id, (cents.get(prediction.user_id) ?? 0) + Math.round(points * 100));
      }
    }
  }
  return new Map(Array.from(cents, ([userId, total]) => [userId, total / 100]));
}

/**
 * Distributes `POINTS_PER_EVENT` equally among every prediction that
 * matches the correct answer for an event. E.g. 1 correct pick gets all
 * 100 points, 2 correct picks get 50 points each, 10 correct picks get 10
 * points each. A prediction the user "locked" earns `LOCK_MULTIPLIER`
 * times its share (locks never change the share of other users). Returns
 * an empty array when there is no correct answer or no correct
 * predictions.
 */
export function calculateEventPoints(
  predictions: { user_id: string; selected_option: string; is_locked?: boolean }[],
  correctAnswer: string | null,
): ScoredPrediction[] {
  if (!correctAnswer) return [];

  const winners = predictions.filter(
    (prediction) =>
      normaliseAnswer(prediction.selected_option) === normaliseAnswer(correctAnswer),
  );

  if (winners.length === 0) return [];

  return winners.map((winner) => ({
    user_id: winner.user_id,
    points: calculatePointsPerPrediction(winners.length, winner.is_locked === true),
  }));
}
