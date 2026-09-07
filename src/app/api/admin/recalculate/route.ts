import { NextResponse } from "next/server";
import { isValidAdminKey } from "@/lib/supabase/admin";
import { recalculateLeaderboard } from "@/lib/leaderboard";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !isValidAdminKey(body.adminKey)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  try {
    const usersScored = await recalculateLeaderboard();
    return NextResponse.json({ success: true, usersScored });
  } catch (recalcError) {
    const message = recalcError instanceof Error ? recalcError.message : "Recalculation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
