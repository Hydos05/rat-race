"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SUBMISSION_DEADLINE } from "@/lib/constants";
import { OTHER_OPTION } from "@/data/events";
import CountdownTimer from "@/components/CountdownTimer";
import type { Prediction, RatRaceEvent } from "@/types/database";

interface PredictionFormProps {
  userId: string;
  events: RatRaceEvent[];
  existingPredictions: Prediction[];
  loadError: string | null;
}

type Answers = Record<string, string>;

function buildInitialAnswers(events: RatRaceEvent[], existing: Prediction[]): Answers {
  const byEvent = new Map(existing.map((prediction) => [prediction.event_id, prediction]));
  const answers: Answers = {};

  for (const event of events) {
    const prediction = byEvent.get(event.id);
    if (!prediction) continue;
    answers[event.id] = event.options.includes(prediction.selected_option)
      ? prediction.selected_option
      : OTHER_OPTION;
  }

  return answers;
}

function buildInitialOtherText(events: RatRaceEvent[], existing: Prediction[]): Answers {
  const byEvent = new Map(existing.map((prediction) => [prediction.event_id, prediction]));
  const otherText: Answers = {};

  for (const event of events) {
    const prediction = byEvent.get(event.id);
    if (!prediction) continue;
    if (!event.options.includes(prediction.selected_option)) {
      otherText[event.id] = prediction.selected_option;
    }
  }

  return otherText;
}

export default function PredictionForm({
  userId,
  events,
  existingPredictions,
  loadError,
}: PredictionFormProps) {
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [answers, setAnswers] = useState<Answers>(() =>
    buildInitialAnswers(events, existingPredictions),
  );
  const [otherText, setOtherText] = useState<Answers>(() =>
    buildInitialOtherText(events, existingPredictions),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function checkDeadline() {
      setDeadlinePassed(Date.now() > SUBMISSION_DEADLINE.getTime());
    }
    checkDeadline();
    const interval = setInterval(checkDeadline, 1000);
    return () => clearInterval(interval);
  }, []);

  const categories = useMemo(() => {
    const groups = new Map<string, RatRaceEvent[]>();
    for (const event of events) {
      const list = groups.get(event.category) ?? [];
      list.push(event);
      groups.set(event.category, list);
    }
    return Array.from(groups.entries());
  }, [events]);

  function handleSelect(eventId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [eventId]: value }));
  }

  function handleOtherText(eventId: string, value: string) {
    setOtherText((prev) => ({ ...prev, [eventId]: value }));
  }

  async function handleSubmit() {
    setError(null);
    setMessage(null);

    if (deadlinePassed) {
      setError("The submission deadline has passed.");
      return;
    }

    const existingEventIds = new Set(
      existingPredictions.map((prediction) => prediction.event_id),
    );

    const rows: { user_id: string; event_id: string; selected_option: string }[] = [];
    const deletions: string[] = [];

    for (const event of events) {
      if (event.locked) continue;
      const selected = answers[event.id];

      if (!selected) {
        if (existingEventIds.has(event.id)) {
          deletions.push(event.id);
        }
        continue;
      }

      const finalAnswer = selected === OTHER_OPTION ? otherText[event.id]?.trim() : selected;

      if (!finalAnswer) {
        setError(`Please provide an answer for "${event.name}" or leave it blank.`);
        return;
      }

      rows.push({ user_id: userId, event_id: event.id, selected_option: finalAnswer });
    }

    if (rows.length === 0 && deletions.length === 0) {
      setError("Please make at least one prediction before submitting.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from("predictions")
          .upsert(rows, { onConflict: "user_id,event_id" });

        if (upsertError) {
          setError(upsertError.message);
          return;
        }
      }

      if (deletions.length > 0) {
        const { error: deleteError } = await supabase
          .from("predictions")
          .delete()
          .eq("user_id", userId)
          .in("event_id", deletions);

        if (deleteError) {
          setError(deleteError.message);
          return;
        }
      }

      setMessage("Your predictions have been saved!");
    } catch {
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <p role="alert" className="text-sm text-red-400">
        Failed to load events: {loadError}
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No events are available yet. Please check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-100">Make your predictions</h1>
        <CountdownTimer deadline={SUBMISSION_DEADLINE} />
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

      <div className="space-y-8">
        {categories.map(([category, categoryEvents]) => (
          <section key={category} className="space-y-3">
            <h2 className="text-lg font-semibold text-cyan-400 border-b border-gray-800 pb-1">
              {category}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {categoryEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2"
                >
                  <label htmlFor={`event-${event.id}`} className="block font-medium text-gray-100">
                    {event.name}
                    {event.locked && (
                      <span className="ml-2 text-xs font-normal text-red-400">(locked)</span>
                    )}
                  </label>
                  {event.description && (
                    <p className="text-xs text-gray-400">{event.description}</p>
                  )}
                  <select
                    id={`event-${event.id}`}
                    value={answers[event.id] ?? ""}
                    disabled={event.locked || deadlinePassed}
                    onChange={(e) => handleSelect(event.id, e.target.value)}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 disabled:bg-gray-900 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="">Select an option&hellip;</option>
                    {event.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    <option value={OTHER_OPTION}>Other</option>
                  </select>
                  {answers[event.id] === OTHER_OPTION && (
                    <input
                      type="text"
                      placeholder="Your answer"
                      value={otherText[event.id] ?? ""}
                      disabled={event.locked || deadlinePassed}
                      onChange={(e) => handleOtherText(event.id, e.target.value)}
                      className="w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 disabled:bg-gray-900 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="sticky bottom-4 flex justify-center">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || deadlinePassed}
          className="bg-cyan-500 text-black px-6 py-3 rounded-md font-medium shadow-lg hover:bg-cyan-400 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save predictions"}
        </button>
      </div>
    </div>
  );
}
