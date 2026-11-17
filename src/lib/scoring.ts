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
