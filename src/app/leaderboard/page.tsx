import { createClient } from "@supabase/supabase-js";
import LeaderboardTable from "@/app/leaderboard/LeaderboardTable";
import type { LeaderboardEntry } from "@/types/database";

interface LeaderboardRow {
  user_id: string;
  total_points: number;
  updated_at: string;
  users: { full_name: string | null; email: string } | null;
}

export default async function LeaderboardPage() {
  // Use service_role key to bypass RLS for the join
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from("leaderboard")
    .select("user_id, total_points, updated_at, users ( full_name, email )")
    .order("total_points", { ascending: false });

  const rows = (data as unknown as LeaderboardRow[] | null) ?? [];

  const entries: LeaderboardEntry[] = rows.map((row) => ({
    user_id: row.user_id,
    total_points: row.total_points,
    updated_at: row.updated_at,
    full_name: row.users?.full_name ?? null,
    email: row.users?.email,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Leaderboard</h1>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          Failed to load leaderboard: {error.message}
        </p>
      )}
      <LeaderboardTable initialEntries={entries} />
    </div>
  );
}
