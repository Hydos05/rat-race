import { POINTS_PER_EVENT } from "@/lib/constants";

export interface ScoredPrediction {
  user_id: string;
  points: number;
}

/**
 * Distributes `POINTS_PER_EVENT` equally among every prediction that
 * matches the correct answer for an event. E.g. 1 correct pick gets all
 * 100 points, 2 correct picks get 50 points each, 10 correct picks get 10
 * points each. Returns an empty array when there is no correct answer or
 * no correct predictions.
 */
export function calculateEventPoints(
  predictions: { user_id: string; selected_option: string }[],
  correctAnswer: string | null,
): ScoredPrediction[] {
  if (!correctAnswer) return [];

  const winners = predictions.filter(
    (prediction) =>
      prediction.selected_option.trim().toLowerCase() ===
      correctAnswer.trim().toLowerCase(),
  );

  if (winners.length === 0) return [];

  const pointsEach = Math.round((POINTS_PER_EVENT / winners.length) * 100) / 100;

  return winners.map((winner) => ({
    user_id: winner.user_id,
    points: pointsEach,
  }));
}
