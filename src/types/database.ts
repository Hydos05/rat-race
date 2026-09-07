export type EventCategory =
  | "AFL"
  | "Cricket"
  | "American Football"
  | "College Football"
  | "Basketball"
  | "Baseball"
  | "Ice Hockey"
  | "Soccer"
  | "Rugby League"
  | "Rugby Union"
  | "Tennis"
  | "Golf"
  | "Other";

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatRaceEvent {
  id: string;
  category: EventCategory;
  name: string;
  description: string | null;
  options: string[];
  correct_answer: string | null;
  points_pool: number;
  display_order: number;
  created_at: string;
  locked: boolean;
}

export interface Prediction {
  id: string;
  user_id: string;
  event_id: string;
  selected_option: string;
  submitted_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  updated_at: string;
  full_name?: string | null;
  email?: string;
}

/** Convenience type describing the seed data shape used to populate `events`. */
export interface EventSeed {
  category: EventCategory;
  name: string;
  description?: string;
  options: string[];
  display_order: number;
}
