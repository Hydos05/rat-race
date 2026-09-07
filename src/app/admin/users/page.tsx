"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Prediction, RatRaceEvent } from "@/types/database";

interface UserWithPredictions {
  userId: string;
  userEmail: string;
  predictions: (Prediction & { eventName?: string })[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithPredictions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();

        // Fetch all predictions with user info
        const { data: predictions, error: predictionsError } = await supabase
          .from("predictions")
          .select("*");

        if (predictionsError) throw predictionsError;

        // Fetch all events for name mapping
        const { data: events, error: eventsError } = await supabase
          .from("events")
          .select("id, name");

        if (eventsError) throw eventsError;

        // Fetch all users
        const { data: authUsers, error: usersError } = await supabase.auth.admin.listUsers();

        if (usersError) throw usersError;

        // Create a map of event IDs to names
        const eventMap = new Map((events || []).map((e) => [e.id, e.name]));

        // Group predictions by user
        const userMap = new Map<string, UserWithPredictions>();

        for (const user of authUsers.users) {
          userMap.set(user.id, {
            userId: user.id,
            userEmail: user.email || "Unknown",
            predictions: [],
          });
        }

        // Assign predictions to users and add event names
        for (const prediction of predictions || []) {
          const userData = userMap.get(prediction.user_id);
          if (userData) {
            userData.predictions.push({
              ...prediction,
              eventName: eventMap.get(prediction.event_id),
            });
          }
        }

        // Sort users by email and convert to array
        const userArray = Array.from(userMap.values()).sort((a, b) =>
          a.userEmail.localeCompare(b.userEmail),
        );

        setUsers(userArray);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="text-gray-100">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-100 mb-8">Users & Predictions</h1>

        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.userId} className="bg-gray-800 border border-gray-700 rounded-lg">
              <button
                onClick={() =>
                  setExpandedUser(expandedUser === user.userId ? null : user.userId)
                }
                className="w-full px-6 py-4 text-left hover:bg-gray-750 transition flex items-center justify-between"
              >
                <div>
                  <p className="text-gray-100 font-medium">{user.userEmail}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    ID: {user.userId.substring(0, 8)}...
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">
                    {user.predictions.length} prediction{user.predictions.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-gray-400">
                    {expandedUser === user.userId ? "−" : "+"}
                  </span>
                </div>
              </button>

              {expandedUser === user.userId && (
                <div className="px-6 py-4 bg-gray-750 border-t border-gray-700 space-y-3">
                  {user.predictions.length === 0 ? (
                    <p className="text-gray-400 text-sm">No predictions</p>
                  ) : (
                    <div className="space-y-2">
                      {user.predictions.map((pred) => (
                        <div key={pred.id} className="bg-gray-800 p-3 rounded text-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-gray-100 font-medium">{pred.eventName}</p>
                              <p className="text-gray-400 text-xs mt-1">{pred.selected_option}</p>
                            </div>
                            {pred.is_locked && (
                              <span className="ml-2 text-yellow-300 text-xs font-medium">
                                🔒 LOCKED
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <p className="text-gray-400 text-center py-8">No users found</p>
        )}
      </div>
    </div>
  );
}
