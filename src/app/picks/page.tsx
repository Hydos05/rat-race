import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { createClient } from "@/lib/supabase/server";

type Event = { id: string; name: string; category: string };
type User = { id: string; full_name: string | null };
type Pick = { user_id: string; event_id: string; selected_option: string };

export default async function PicksPage() {
  const auth = await createClient();
  const { data: { user }, error: authError } = await auth.auth.getUser();

  if (authError || !user) redirect("/login");

  let events: Event[];
  let users: User[];
  let picks: Pick[];
  try {
    const supabase = createAdminClient();
    [events, users, picks] = await Promise.all([
      fetchAllRows<Event>((from, to) =>
        supabase.from("events").select("id, name, category")
          .order("display_order").order("id").range(from, to),
      ),
      fetchAllRows<User>((from, to) =>
        supabase.from("users").select("id, full_name").order("id").range(from, to),
      ),
      fetchAllRows<Pick>((from, to) =>
        supabase.from("predictions").select("user_id, event_id, selected_option")
          .order("id").range(from, to),
      ),
    ]);
  } catch (error) {
    console.error("Failed to load all picks:", error);
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Everyone&apos;s picks</h1>
        <p role="alert" className="text-red-400">Could not load picks. Please try again later.</p>
      </div>
    );
  }

  users.sort((a, b) => (a.full_name || "Anonymous").localeCompare(b.full_name || "Anonymous"));
  const categories = new Map<string, Event[]>();
  for (const event of events) {
    const group = categories.get(event.category) ?? [];
    group.push(event);
    categories.set(event.category, group);
  }
  const picksByEvent = new Map<string, Map<string, string>>();
  for (const pick of picks) {
    const eventPicks = picksByEvent.get(pick.event_id) ?? new Map<string, string>();
    eventPicks.set(pick.user_id, pick.selected_option);
    picksByEvent.set(pick.event_id, eventPicks);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-100">Everyone&apos;s picks</h1>
      <p className="text-sm text-gray-300">
        Saved picks are shown below. A dash means no pick has been saved. Scroll sideways to see all users.
      </p>
      {events.length === 0 ? (
        <p className="text-gray-400">No events are available yet.</p>
      ) : users.length === 0 ? (
        <p className="text-gray-400">No participants are available yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800" role="region" aria-label="Everyone's picks" tabIndex={0}>
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-800">
                <th scope="col" className="sticky left-0 z-10 bg-gray-800 min-w-48 px-4 py-3">Event</th>
                {users.map((participant) => (
                  <th key={participant.id} scope="col" className="min-w-36 px-4 py-3 align-bottom">
                    {participant.full_name || "Anonymous"}
                  </th>
                ))}
              </tr>
            </thead>
            {Array.from(categories, ([category, categoryEvents]) => (
              <tbody key={category}>
                <tr className="bg-gray-800">
                  <th scope="rowgroup" colSpan={users.length + 1} className="px-4 py-2 text-cyan-400">
                    {category}
                  </th>
                </tr>
                {categoryEvents.map((event) => (
                  <tr key={event.id} className="bg-gray-900 border-t border-gray-800">
                    <th scope="row" className="sticky left-0 bg-gray-900 px-4 py-3 font-medium">
                      {event.name}
                    </th>
                    {users.map((participant) => {
                      const pick = picksByEvent.get(event.id)?.get(participant.id);
                      return (
                        <td key={participant.id} className="px-4 py-3 text-gray-300">
                          {pick ?? <span aria-label="No saved pick">&mdash;</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </div>
  );
}
