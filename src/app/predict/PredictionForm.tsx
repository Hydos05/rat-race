"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LOCK_MULTIPLIER, MAX_LOCKS, SUBMISSION_DEADLINE } from "@/lib/constants";
import { OTHER_OPTION, cleanOptions } from "@/lib/eventOptions";
import CountdownTimer from "@/components/CountdownTimer";
import type { Prediction, RatRaceEvent } from "@/types/database";

interface PredictionFormProps {
  userId: string;
  events: RatRaceEvent[];
  existingPredictions: Prediction[];
  loadError: string | null;
}

type Answers = Record<string, string>;
type Locks = Record<string, boolean>;

/**
 * Ignore repeated clicks on the same lock within this window, so a quick
 * unlock/relike can't fire overlapping requests.
 */
const LOCK_TOGGLE_DEBOUNCE_MS = 150;

/** Number of events currently locked, counted from the live form state. */
function countLocks(locks: Locks, exceptEventId?: string): number {
  return Object.entries(locks).filter(
    ([eventId, isLocked]) => isLocked && eventId !== exceptEventId,
  ).length;
}

/**
 * Returns the events with their dropdown options cleaned, so a stored
 * "Other" entry never shows up alongside the "Other" choice the form
 * always appends.
 */
function withCleanOptions(events: RatRaceEvent[]): RatRaceEvent[] {
  return events.map((event) => ({ ...event, options: cleanOptions(event.options) }));
}

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

function buildInitialLocks(existing: Prediction[]): Locks {
  const locks: Locks = {};
  for (const prediction of existing) {
    if (prediction.is_locked) locks[prediction.event_id] = true;
  }
  return locks;
}

export default function PredictionForm({
  userId,
  events,
  existingPredictions,
  loadError,
}: PredictionFormProps) {
  const cleanedEvents = useMemo(() => withCleanOptions(events), [events]);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [answers, setAnswers] = useState<Answers>(() =>
    buildInitialAnswers(cleanedEvents, existingPredictions),
  );
  const [otherText, setOtherText] = useState<Answers>(() =>
    buildInitialOtherText(cleanedEvents, existingPredictions),
  );
  const [locks, setLocks] = useState<Locks>(() => buildInitialLocks(existingPredictions));
  // Mirrors `locks` so handlers can read the up-to-date lock state without
  // waiting for a re-render (a stale count made relocking look like a 4th lock).
  const locksRef = useRef<Locks>(locks);
  const lastToggleAtRef = useRef<Record<string, number>>({});
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(
    () => new Set(existingPredictions.map((prediction) => prediction.event_id)),
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
    for (const event of cleanedEvents) {
      const list = groups.get(event.category) ?? [];
      list.push(event);
      groups.set(event.category, list);
    }
    return Array.from(groups.entries());
  }, [cleanedEvents]);

  const lockCount = useMemo(() => countLocks(locks), [locks]);

  /** Updates the lock state and keeps `locksRef` in sync with it. */
  const updateLocks = useCallback((updater: (prev: Locks) => Locks) => {
    const next = updater(locksRef.current);
    locksRef.current = next;
    setLocks(next);
  }, []);

  function handleSelect(eventId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [eventId]: value }));
    // Clearing a pick also releases its lock so it can be used elsewhere.
    if (value === "") {
      updateLocks((prev) => {
        if (!prev[eventId]) return prev;
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    }
  }

  function handleOtherText(eventId: string, value: string) {
    setOtherText((prev) => ({ ...prev, [eventId]: value }));
  }

  /**
   * Toggles a Lock. The change is applied to the local state straight away so
   * unlocking frees its slot immediately and the event can be relocked without
   * being counted as an extra lock.
   */
  function handleToggleLock(eventId: string) {
    // Debounce rapid clicks on the same lock to avoid overlapping requests.
    const now = Date.now();
    if (now - (lastToggleAtRef.current[eventId] ?? 0) < LOCK_TOGGLE_DEBOUNCE_MS) return;
    lastToggleAtRef.current[eventId] = now;

    const wasLocked = locksRef.current[eventId] ?? false;
    const nextLocked = !wasLocked;

    // Count the other locked events live, so replacing or relocking an event
    // is never mistaken for adding a 4th lock.
    if (nextLocked && countLocks(locksRef.current, eventId) >= MAX_LOCKS) {
      setMessage(null);
      setError(`Maximum ${MAX_LOCKS} locks per competition`);
      return;
    }

    setError(null);
    setMessage(null);

    updateLocks((prev) => {
      const next = { ...prev };
      if (nextLocked) {
        next[eventId] = true;
      } else {
        delete next[eventId];
      }
      return next;
    });

    const eventName = cleanedEvents.find((event) => event.id === eventId)?.name ?? "this event";
    setMessage(
      nextLocked
        ? `Locked "${eventName}" for ${LOCK_MULTIPLIER}x points.`
        : `Unlocked "${eventName}".`,
    );
  }

  async function handleClearAllLocks() {
    setError(null);
    setMessage(null);

    // Clear all locks locally
    updateLocks(() => ({}));
    setMessage("All locks cleared.");
  }

  async function handleSubmit() {
    setError(null);
    setMessage(null);

    if (deadlinePassed) {
      setError("The submission deadline has passed.");
      return;
    }

    if (countLocks(locksRef.current) > MAX_LOCKS) {
      setError(`Maximum ${MAX_LOCKS} locks per competition`);
      return;
    }

    const rows: {
      user_id: string;
      event_id: string;
      selected_option: string;
      is_locked: boolean;
    }[] = [];
    const deletions: string[] = [];

    for (const event of cleanedEvents) {
      if (event.locked) continue;
      const selected = answers[event.id];

      if (!selected) {
        if (savedEventIds.has(event.id)) {
          deletions.push(event.id);
        }
        continue;
      }

      const finalAnswer = selected === OTHER_OPTION ? otherText[event.id]?.trim() : selected;

      if (!finalAnswer) {
        setError(`Please provide an answer for "${event.name}" or leave it blank.`);
        return;
      }

      rows.push({
        user_id: userId,
        event_id: event.id,
        selected_option: finalAnswer,
        is_locked: locks[event.id] ?? false,
      });
    }

    if (rows.length === 0 && deletions.length === 0) {
      setError("Please make at least one prediction before submitting.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      if (rows.length > 0) {
        // Separate rows into new predictions and updates to existing predictions
        const newRows = rows.filter((row) => !savedEventIds.has(row.event_id));
        const existingRows = rows.filter((row) => savedEventIds.has(row.event_id));

        // Save unlocked rows first
        const unlockedNewRows = newRows.filter((row) => !row.is_locked);
        const unlockedExistingRows = existingRows.filter((row) => !row.is_locked);

        if (unlockedNewRows.length > 0 || unlockedExistingRows.length > 0) {
          const { error: upsertError } = await supabase
            .from("predictions")
            .upsert([...unlockedNewRows, ...unlockedExistingRows], {
              onConflict: "user_id,event_id",
            });

          if (upsertError) {
            setError(upsertError.message);
            return;
          }
        }

        // Save all locked rows one at a time (both new and existing)
        // This overwrites any previous lock state
        const allLockedRows = [
          ...newRows.filter((row) => row.is_locked),
          ...existingRows.filter((row) => row.is_locked),
        ];
        
        for (const row of allLockedRows) {
          const { error: upsertError } = await supabase
            .from("predictions")
            .upsert([row], { onConflict: "user_id,event_id" });

          if (upsertError) {
            setError(
              upsertError.code === "23514"
                ? `Maximum ${MAX_LOCKS} locks per competition`
                : upsertError.message,
            );
            return;
          }
        }

        // For existing predictions that are NOT locked, clear their lock if they had one
        const unlockedExistingEventIds = new Set(
          existingRows.filter((row) => !row.is_locked).map((row) => row.event_id),
        );
        
        for (const eventId of unlockedExistingEventIds) {
          const existingPrediction = existingPredictions.find(
            (p) => p.event_id === eventId,
          );
          if (existingPrediction?.is_locked) {
            const { error: upsertError } = await supabase
              .from("predictions")
              .upsert(
                [
                  {
                    user_id: userId,
                    event_id: eventId,
                    selected_option: existingPrediction.selected_option,
                    is_locked: false,
                  },
                ],
                { onConflict: "user_id,event_id" },
              );

            if (upsertError) {
              setError(upsertError.message);
              return;
            }
          }
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

      const deletedEventIds = new Set(deletions);
      const nextSavedEventIds = new Set(
        [...savedEventIds, ...rows.map((row) => row.event_id)].filter(
          (eventId) => !deletedEventIds.has(eventId),
        ),
      );
      setSavedEventIds(nextSavedEventIds);
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

  if (cleanedEvents.length === 0) {
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

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-100">
            <span aria-hidden="true">&#9889;</span> Locks used:{" "}
            <span className="text-yellow-300">
              {lockCount} / {MAX_LOCKS}
            </span>
          </p>
          {lockCount > 0 && (
            <button
              type="button"
              onClick={handleClearAllLocks}
              disabled={saving}
              className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 disabled:opacity-50"
            >
              Clear all locks
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Lock up to {MAX_LOCKS} events to earn {LOCK_MULTIPLIER}x the points you win on
          them. Locks can be changed any time before the deadline.
        </p>
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
                  className={`bg-gray-900 border rounded-lg p-4 space-y-2 ${
                    locks[event.id] ? "border-yellow-400/70" : "border-gray-800"
                  }`}
                >
                  <label htmlFor={`event-${event.id}`} className="block font-medium text-gray-100">
                    {locks[event.id] && (
                      <span className="mr-1 text-yellow-300" title="Locked: double points">
                        <span aria-hidden="true">&#9889;</span>
                        <span className="sr-only">Locked for double points:</span>
                      </span>
                    )}
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
                  <label
                    htmlFor={`lock-${event.id}`}
                    className="flex items-center gap-2 text-xs text-gray-300"
                    title={`Locked events pay ${LOCK_MULTIPLIER}x points. You can lock up to ${MAX_LOCKS} events.`}
                  >
                    <input
                      id={`lock-${event.id}`}
                      type="checkbox"
                      checked={locks[event.id] ?? false}
                      disabled={
                        event.locked ||
                        deadlinePassed ||
                        (!locks[event.id] && lockCount >= MAX_LOCKS)
                      }
                      onChange={() => handleToggleLock(event.id)}
                      className="h-4 w-4 accent-yellow-400 disabled:opacity-50"
                    />
                    Lock this event ({LOCK_MULTIPLIER}x points)
                  </label>
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
