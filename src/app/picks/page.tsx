import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { createClient } from "@/lib/supabase/server";
import { calculatePointsPerPrediction, groupPredictionsByEventAndAnswer } from "@/lib/scoring";
import PicksTableScroller from "./PicksTableScroller";

type Event = { id: string; name: string; category: string };
type User = { id: string; full_name: string | null };
type Pick = { user_id: string; event_id: string; selected_option: string; is_locked: boolean };

const maxBand = 10;
const pointBands = Array.from({ length: maxBand + 1 }, (_, index) => {
  const start = index * 10;
  return {
    label: index === maxBand ? `${start}+` : `${start}-${start + 9}`,
    colour: `hsl(${Math.round((index * 240) / maxBand)} 85% ${index % 2 === 0 ? 85 : 72}%)`,
  };
});

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
        supabase.from("predictions").select("user_id, event_id, selected_option, is_locked")
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
  const groupedPicks = groupPredictionsByEventAndAnswer(picks);
  const picksByEvent = new Map<string, Map<string, { option: string; points: number; locked: boolean }>>();
  for (const [eventId, groups] of groupedPicks) {
    const eventPicks = new Map<string, { option: string; points: number; locked: boolean }>();
    for (const group of groups.values()) {
      for (const pick of group) {
        eventPicks.set(pick.user_id, {
          option: pick.selected_option,
          points: calculatePointsPerPrediction(group.length, pick.is_locked),
          locked: pick.is_locked,
        });
      }
    }
    picksByEvent.set(eventId, eventPicks);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-100">Everyone&apos;s picks</h1>
      <p className="text-sm text-gray-300">
        Saved picks are shown below. A dash means no pick has been saved. Use the slider to see all users.
      </p>
      <p className="text-sm text-gray-300">
        Points shown are potential points if the pick is correct, including locks, rounded to whole
        points. The leaderboard uses two decimal places. Values can change as picks change.
      </p>
      {events.length > 0 && users.length > 0 && (
        <div className="space-y-2 text-sm text-gray-200">
          <p>Pick value colour key (rounded points if correct):</p>
          <ul className="grid grid-cols-3 gap-1 sm:grid-cols-6 lg:grid-cols-7">
            {pointBands.map((band) => (
              <li key={band.label} style={{ backgroundColor: band.colour }} className="rounded px-2 py-1 text-center text-gray-950">
                {band.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {events.length === 0 ? (
        <p className="text-gray-400">No events are available yet.</p>
      ) : users.length === 0 ? (
        <p className="text-gray-400">No participants are available yet.</p>
      ) : (
        <PicksTableScroller>
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
                      const roundedPoints = pick ? Math.round(pick.points) : null;
                      const band = roundedPoints === null
                        ? null
                        : pointBands[Math.min(Math.floor(roundedPoints / 10), maxBand)];
                      return (
                        <td
                          key={participant.id}
                          style={band ? { backgroundColor: band.colour } : undefined}
                          className={`px-4 py-3 ${band ? "text-gray-950" : "text-gray-300"}`}
                        >
                          {pick ? (
                            <>
                              <span>{pick.option}</span>
                              <span className="block text-xs">
                                {roundedPoints} points if correct{pick.locked ? " (locked)" : ""}
                              </span>
                            </>
                          ) : (
                            <span aria-label="No saved pick">&mdash;</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </PicksTableScroller>
      )}
    </div>
  );
}
