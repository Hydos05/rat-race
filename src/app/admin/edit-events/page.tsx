"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RAT_RACE_EVENTS } from "@/data/events";
import { cleanOptions } from "@/lib/eventOptions";
import type { RatRaceEvent } from "@/types/database";

async function fetchEvents() {
  const supabase = createClient();
  return supabase.from("events").select("*").order("display_order", { ascending: true });
}

export default function EditEventsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [events, setEvents] = useState<RatRaceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const defaultsByName = useMemo(
    // Matched by name because `events.name` is unique in the database
    // (see supabase/migrations/0001_init.sql) and mirrors `RAT_RACE_EVENTS`.
    () => new Map(RAT_RACE_EVENTS.map((event) => [event.name, event.options])),
    [],
  );

  async function loadEvents(ignoreRef?: { current: boolean }) {
    const { data, error: fetchError } = await fetchEvents();

    if (!ignoreRef?.current) {
      if (fetchError) {
        setError(fetchError.message);
      } else {
        const loaded = (data as RatRaceEvent[]) ?? [];
        setEvents(loaded);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const event of loaded) {
            if (next[event.id] === undefined) {
              next[event.id] = event.options.join("\n");
            }
          }
          return next;
        });
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!unlocked) return;
    const ignoreRef = { current: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents(ignoreRef);
    return () => {
      ignoreRef.current = true;
    };
  }, [unlocked]);

  function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    if (!adminKey.trim()) return;
    setLoading(true);
    setUnlocked(true);
  }

  function parseOptions(text: string) {
    return cleanOptions(text.split("\n"));
  }

  async function saveOptions(eventId: string, options: string[], notice?: string) {
    setError(null);
    setMessage(null);

    if (options.length === 0) {
      setError("Enter at least one option.");
      return;
    }

    setSavingId(eventId);
    try {
      const response = await fetch("/api/admin/update-event-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey, eventId, options }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Request failed.");
        return;
      }
      setMessage(notice ? `Options saved. ${notice}` : "Options saved.");
      setEvents((prev) =>
        prev.map((event) => (event.id === eventId ? { ...event, options } : event)),
      );
      setDrafts((prev) => ({ ...prev, [eventId]: options.join("\n") }));
    } catch {
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  function handleSave(event: RatRaceEvent) {
    const rawLines = (drafts[event.id] ?? "").split("\n");
    const options = parseOptions(drafts[event.id] ?? "");
    const removedCount = rawLines.length - options.length;
    const notice =
      removedCount > 0
        ? `Removed ${removedCount} blank or duplicate line${removedCount === 1 ? "" : "s"}.`
        : undefined;
    saveOptions(event.id, options, notice);
  }

  function handleReset(event: RatRaceEvent) {
    const defaults = defaultsByName.get(event.name);
    if (!defaults) {
      setError(`No default options found for "${event.name}".`);
      return;
    }
    if (
      !window.confirm(
        `Reset "${event.name}" to its default options? This will overwrite any unsaved or custom changes.`,
      )
    ) {
      return;
    }
    saveOptions(event.id, defaults);
  }

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-100">Admin access</h1>
        <form onSubmit={handleUnlock} className="space-y-3">
          <label htmlFor="adminKey" className="block text-sm font-medium text-gray-200">
            Admin key
          </label>
          <input
            id="adminKey"
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            type="submit"
            className="w-full bg-cyan-500 text-black py-2 rounded-md font-medium hover:bg-cyan-400"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Edit event options</h1>
      <p className="text-sm text-gray-400">
        Add, remove, or reorder the dropdown options shown to users on the prediction form. One
        option per line.
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-300 bg-red-950/40 border border-red-800 rounded-md p-3">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-green-300 bg-green-950/40 border border-green-800 rounded-md p-3">
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading events&hellip;</p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3"
            >
              <div>
                <p className="font-medium text-gray-100">{event.name}</p>
                <p className="text-xs text-gray-400">{event.category}</p>
              </div>
              <textarea
                rows={6}
                value={drafts[event.id] ?? ""}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [event.id]: e.target.value }))
                }
                className="w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(event)}
                  disabled={savingId === event.id}
                  className="bg-cyan-500 text-black px-3 py-2 rounded-md text-sm font-medium hover:bg-cyan-400 disabled:opacity-60"
                >
                  {savingId === event.id ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => handleReset(event)}
                  disabled={savingId === event.id || !defaultsByName.has(event.name)}
                  className="border border-gray-700 px-3 py-2 rounded-md text-sm font-medium text-gray-100 hover:bg-gray-800 disabled:opacity-60"
                >
                  Reset to defaults
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
