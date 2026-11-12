import { NextResponse } from "next/server";
import { createAdminClient, isValidAdminKey } from "@/lib/supabase/admin";

interface AdminPredictionRow {
  user_id: string;
  event_id: string;
  selected_option: string;
  is_locked: boolean;
  events: { name: string; category: string } | null;
}

/**
 * Returns every prediction grouped by user (including which ones the user
 * locked) so the admin panel can review entries.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !isValidAdminKey(body.adminKey)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const [predictionsResult, usersResult, feesResult] = await Promise.all([
    supabase.from("predictions").select(
      "user_id, event_id, selected_option, is_locked, events ( name, category )",
    ),
    supabase.from("users").select("id, full_name, email"),
    supabase.from("entry_fees").select("user_id, paid"),
  ]);

  const error = predictionsResult.error ?? usersResult.error ?? feesResult.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (predictionsResult.data as unknown as AdminPredictionRow[] | null) ?? [];
  const feesByUser = new Map((feesResult.data ?? []).map((fee) => [fee.user_id, fee.paid]));
  const byUser = new Map<
    string,
    {
      userId: string;
      name: string;
      feesPaid: boolean;
      lockCount: number;
      predictions: {
        eventId: string;
        eventName: string;
        selectedOption: string;
        isLocked: boolean;
      }[];
    }
  >();

  for (const user of usersResult.data ?? []) {
    byUser.set(user.id, {
      userId: user.id,
      name: user.full_name || user.email || "Anonymous",
      feesPaid: feesByUser.get(user.id) === true,
      lockCount: 0,
      predictions: [],
    });
  }

  for (const row of rows) {
    const entry = byUser.get(row.user_id);
    if (!entry) {
      return NextResponse.json({ error: "A prediction has no matching user. Reload and try again." }, { status: 500 });
    }
    entry.predictions.push({
      eventId: row.event_id,
      eventName: row.events?.name ?? "Unknown event",
      selectedOption: row.selected_option,
      isLocked: row.is_locked,
    });
    if (row.is_locked) entry.lockCount += 1;
    byUser.set(row.user_id, entry);
  }

  const users = Array.from(byUser.values()).map((entry) => ({
    ...entry,
    predictions: entry.predictions.sort((a, b) =>
      a.eventName.localeCompare(b.eventName),
    ),
  }));

  users.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ users });
}
