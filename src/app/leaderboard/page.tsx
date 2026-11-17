import LeaderboardTable from "@/app/leaderboard/LeaderboardTable";
import { getLeaderboard } from "@/lib/leaderboard";
import type { LeaderboardEntry } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  let entries: LeaderboardEntry[] | null = null;
  try {
    entries = await getLeaderboard();
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Leaderboard</h1>
      {entries === null ? (
        <p role="alert" className="text-sm text-red-400">
          Failed to load leaderboard. Please try again later.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-300">
            Points / possible shows points earned plus potential points from events without a result.
            Possible points include locks and can change as picks change. Refresh the page to
            see the latest totals.
          </p>
          <LeaderboardTable entries={entries} />
        </>
      )}
    </div>
  );
}
