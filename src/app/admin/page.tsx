"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RatRaceEvent } from "@/types/database";

async function fetchEvents() {
  const supabase = createClient();
  return supabase.from("events").select("*").order("display_order", { ascending: true });
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [events, setEvents] = useState<RatRaceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  async function loadEvents(ignoreRef?: { current: boolean }) {
    const { data, error: fetchError } = await fetchEvents();

    if (ignoreRef?.current) return;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setEvents((data as RatRaceEvent[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!unlocked) return;
    const ignoreRef = { current: false };
    // Fetching data when a condition (unlocked) becomes true is a standard
    // effect use case; loadEvents only sets state after its network request
    // resolves, so this doesn't cause synchronous cascading renders.
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

  async function callAdminApi(path: string, body: Record<string, unknown>) {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/admin/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminKey, ...body }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Request failed.");
      return false;
    }
    return true;
  }

  async function handleToggleLock(eventToggle: RatRaceEvent) {
    const success = await callAdminApi("lock", {
      eventId: eventToggle.id,
      locked: !eventToggle.locked,
    });
    if (success) {
      setMessage(`${eventToggle.name} ${eventToggle.locked ? "unlocked" : "locked"}.`);
      setLoading(true);
      loadEvents();
    }
  }

  async function handleSubmitAnswer(eventToScore: RatRaceEvent) {
    const correctAnswer = answerDrafts[eventToScore.id]?.trim();
    if (!correctAnswer) {
      setError("Enter a correct answer first.");
      return;
    }
    const success = await callAdminApi("answer", {
      eventId: eventToScore.id,
      correctAnswer,
    });
    if (success) {
      setMessage(`Answer recorded for ${eventToScore.name}. Leaderboard recalculated.`);
      setLoading(true);
      loadEvents();
    }
  }

  async function handleRecalculate() {
    const success = await callAdminApi("recalculate", {});
    if (success) {
      setMessage("Leaderboard recalculated.");
    }
  }

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Admin access</h1>
        <form onSubmit={handleUnlock} className="space-y-3">
          <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700">
            Admin key
          </label>
          <input
            id="adminKey"
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-md font-medium hover:bg-indigo-700"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Admin panel</h1>
        <button
          type="button"
          onClick={handleRecalculate}
          className="border border-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
        >
          Recalculate leaderboard
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Loading events&hellip;</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{event.name}</p>
                <p className="text-xs text-gray-500">
                  {event.category} &middot;{" "}
                  {event.correct_answer
                    ? `Answer: ${event.correct_answer}`
                    : "No answer recorded"}
                </p>
              </div>
              <input
                type="text"
                placeholder="Correct answer"
                value={answerDrafts[event.id] ?? event.correct_answer ?? ""}
                onChange={(e) =>
                  setAnswerDrafts((prev) => ({ ...prev, [event.id]: e.target.value }))
                }
                className="rounded-md border border-gray-300 px-3 py-2 text-sm sm:w-56"
              />
              <button
                type="button"
                onClick={() => handleSubmitAnswer(event)}
                className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Save answer
              </button>
              <button
                type="button"
                onClick={() => handleToggleLock(event)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  event.locked
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-red-50 text-red-700 hover:bg-red-100"
                }`}
              >
                {event.locked ? "Unlock" : "Lock"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
