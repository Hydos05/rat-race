import { NextResponse } from "next/server";
import { createAdminClient, isValidAdminKey } from "@/lib/supabase/admin";
import { recalculateLeaderboard } from "@/lib/leaderboard";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !isValidAdminKey(body.adminKey)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  const { eventId, correctAnswer } = body as { eventId?: string; correctAnswer?: string };

  if (!eventId || !correctAnswer || !correctAnswer.trim()) {
    return NextResponse.json(
      { error: "eventId and correctAnswer are required." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("events")
    .update({ correct_answer: correctAnswer.trim(), locked: true })
    .eq("id", eventId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const usersScored = await recalculateLeaderboard();
    return NextResponse.json({ success: true, usersScored });
  } catch (recalcError) {
    const message = recalcError instanceof Error ? recalcError.message : "Recalculation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
