import { getLeaderboard } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getLeaderboard(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return Response.json({ error: "Could not load leaderboard." }, { status: 500 });
  }
}
