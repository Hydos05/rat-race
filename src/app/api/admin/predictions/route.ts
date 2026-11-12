import { NextResponse } from "next/server";
import { createAdminClient, isValidAdminKey } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";

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
  let rows: AdminPredictionRow[];
  let userRows: { id: string; full_name: string | null; email: string }[];
  let fees: { user_id: string; paid: boolean }[];
  try {
    [rows, userRows, fees] = await Promise.all([
      fetchAllRows<AdminPredictionRow>((from, to) =>
        supabase
          .from("predictions")
          .select("user_id, event_id, selected_option, is_locked, events ( name, category )")
          .order("id")
          .range(from, to)
          .overrideTypes<AdminPredictionRow[], { merge: false }>(),
      ),
      fetchAllRows<{ id: string; full_name: string | null; email: string }>((from, to) =>
        supabase.from("users").select("id, full_name, email").order("id").range(from, to),
      ),
      fetchAllRows<{ user_id: string; paid: boolean }>((from, to) =>
        supabase.from("entry_fees").select("user_id, paid").order("user_id").range(from, to),
      ),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load predictions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const feesByUser = new Map(fees.map((fee) => [fee.user_id, fee.paid]));
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

  for (const user of userRows) {
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
