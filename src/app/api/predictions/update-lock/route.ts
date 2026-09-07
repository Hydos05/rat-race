import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MAX_LOCKS, SUBMISSION_DEADLINE } from "@/lib/constants";

/**
 * Toggles the "Lock" (double points) flag on one of the signed-in user's
 * predictions. Enforces the maximum of `MAX_LOCKS` locks per user and the
 * submission deadline, and returns the user's updated lock count.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const eventId = body?.eventId;
  const isLocked = body?.isLocked;

  if (typeof eventId !== "string" || typeof isLocked !== "boolean") {
    return NextResponse.json(
      { error: "eventId and isLocked are required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  if (Date.now() > SUBMISSION_DEADLINE.getTime()) {
    return NextResponse.json(
      { error: "The submission deadline has passed." },
      { status: 403 },
    );
  }

  const { data: locked, error: locksError } = await supabase
    .from("predictions")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("is_locked", true);

  if (locksError) {
    return NextResponse.json({ error: locksError.message }, { status: 500 });
  }

  const otherLocks = (locked ?? []).filter((row) => row.event_id !== eventId).length;

  if (isLocked && otherLocks >= MAX_LOCKS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_LOCKS} locks per competition`, lockCount: otherLocks },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("predictions")
    .update({ is_locked: isLocked })
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .select("event_id");

  if (updateError) {
    // The `predictions_max_locks` trigger is the authoritative guard against
    // concurrent requests slipping past the count check above; surface its
    // check violation as the same friendly message.
    const message =
      updateError.code === "23514"
        ? `Maximum ${MAX_LOCKS} locks per competition`
        : updateError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json(
      { error: "Save a prediction for this event before locking it." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    isLocked,
    lockCount: otherLocks + (isLocked ? 1 : 0),
  });
}
