import { NextResponse } from "next/server";
import { createAdminClient, isValidAdminKey } from "@/lib/supabase/admin";

interface AdminPredictionRow {
  user_id: string;
  event_id: string;
  selected_option: string;
  is_locked: boolean;
  users: { full_name: string | null; email: string } | null;
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
  const { data, error } = await supabase
    .from("predictions")
    .select(
      "user_id, event_id, selected_option, is_locked, users ( full_name, email ), events ( name, category )",
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data as unknown as AdminPredictionRow[] | null) ?? [];
  const byUser = new Map<
    string,
    {
      userId: string;
      name: string;
      lockCount: number;
      predictions: {
        eventId: string;
        eventName: string;
        selectedOption: string;
        isLocked: boolean;
      }[];
    }
  >();

  for (const row of rows) {
    const name = row.users?.full_name || row.users?.email || "Anonymous";
    const entry = byUser.get(row.user_id) ?? {
      userId: row.user_id,
      name,
      lockCount: 0,
      predictions: [],
    };
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
