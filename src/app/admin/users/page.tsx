"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Prediction {
  id: string;
  event_id: string;
  selected_option: string;
  is_locked: boolean;
  eventName?: string;
}

interface UserWithPredictions {
  userId: string;
  fullName: string;
  email?: string;
  predictions: Prediction[];
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [users, setUsers] = useState<UserWithPredictions[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    if (!adminKey.trim()) return;
    setLoading(true);
    setUnlocked(true);
  }

  useEffect(() => {
    if (!unlocked) return;

    async function fetchData() {
      try {
        const response = await fetch("/api/admin/users", {
          headers: { "X-Admin-Key": adminKey },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load users");
        }

        const data: UserWithPredictions[] = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
        setUnlocked(false);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [unlocked, adminKey]);

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
                  <p className="text-gray-100 font-medium">{user.fullName}</p>
                  {user.email && <p className="text-xs text-gray-400 mt-1">{user.email}</p>}
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
