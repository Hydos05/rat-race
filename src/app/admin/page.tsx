"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RatRaceEvent } from "@/types/database";

interface AdminUserPredictions {
  name: string;
  lockCount: number;
  predictions: { eventName: string; selectedOption: string; isLocked: boolean }[];
}

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
  const [userPredictions, setUserPredictions] = useState<AdminUserPredictions[] | null>(
    null,
  );

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

  async function handleViewPredictions() {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/admin/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminKey }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Request failed.");
      return;
    }
    setUserPredictions(json.users as AdminUserPredictions[]);
  }

  async function handleRecalculate() {
    const success = await callAdminApi("recalculate", {});
    if (success) {
      setMessage("Leaderboard recalculated.");
    }
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-100">Admin panel</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/edit-events"
            className="border border-gray-700 px-4 py-2 rounded-md text-sm font-medium text-gray-100 hover:bg-gray-800"
          >
            Edit event options
          </Link>
          <button
            type="button"
            onClick={handleViewPredictions}
            className="border border-gray-700 px-4 py-2 rounded-md text-sm font-medium text-gray-100 hover:bg-gray-800"
          >
            View predictions
          </button>
          <button
            type="button"
            onClick={handleRecalculate}
            className="border border-gray-700 px-4 py-2 rounded-md text-sm font-medium text-gray-100 hover:bg-gray-800"
          >
            Recalculate leaderboard
          </button>
        </div>
      </div>

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

      {userPredictions && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-100">Predictions by user</h2>
          {userPredictions.length === 0 ? (
            <p className="text-sm text-gray-400">No predictions have been made yet.</p>
          ) : (
            userPredictions.map((entry) => (
              <div
                key={entry.name}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2"
              >
                <p className="font-medium text-gray-100">
                  {entry.name}{" "}
                  <span className="text-xs font-normal text-yellow-300">
                    <span aria-hidden="true">&#9889;</span> {entry.lockCount} lock
                    {entry.lockCount === 1 ? "" : "s"}
                  </span>
                </p>
                <ul className="text-sm text-gray-300 space-y-1">
                  {entry.predictions.map((prediction) => (
                    <li
                      key={prediction.eventName}
                      className={prediction.isLocked ? "text-yellow-300" : undefined}
                    >
                      {prediction.isLocked && (
                        <span aria-hidden="true" className="mr-1">
                          &#9889;
                        </span>
                      )}
                      {prediction.eventName}: {prediction.selectedOption}
                      {prediction.isLocked && (
                        <span className="ml-1 text-xs">(locked &mdash; 2x points)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading events&hellip;</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-100">{event.name}</p>
                <p className="text-xs text-gray-400">
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
                className="rounded-md border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm sm:w-56"
              />
              <button
                type="button"
                onClick={() => handleSubmitAnswer(event)}
                className="bg-cyan-500 text-black px-3 py-2 rounded-md text-sm font-medium hover:bg-cyan-400"
              >
                Save answer
              </button>
              <button
                type="button"
                onClick={() => handleToggleLock(event)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  event.locked
                    ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                    : "bg-red-950/40 text-red-300 hover:bg-red-900/50"
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
