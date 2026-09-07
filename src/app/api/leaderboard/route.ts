import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    // Use service_role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("leaderboard")
      .select("user_id, total_points, updated_at, users ( full_name, email )")
      .order("total_points", { ascending: false });

    if (error) throw error;

    const rows = (
      data as {
        user_id: string;
        total_points: number;
        updated_at: string;
        users: { full_name: string | null; email: string } | null;
      }[]
    ) ?? [];

    return Response.json(
      rows.map((row) => ({
        user_id: row.user_id,
        total_points: row.total_points,
        updated_at: row.updated_at,
        full_name: row.users?.full_name ?? null,
        email: row.users?.email,
      })),
    );
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}
