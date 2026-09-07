"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/types/database";

export default function LeaderboardTable({
  initialEntries,
}: {
  initialEntries: LeaderboardEntry[];
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("leaderboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard" },
        async () => {
          const { data } = await supabase
            .from("leaderboard")
            .select("user_id, total_points, updated_at, users ( full_name, email )")
            .order("total_points", { ascending: false });

          if (data) {
            setEntries(
              (
                data as unknown as {
                  user_id: string;
                  total_points: number;
                  updated_at: string;
                  users: { full_name: string | null; email: string } | null;
                }[]
              ).map((row) => ({
                user_id: row.user_id,
                total_points: row.total_points,
                updated_at: row.updated_at,
                full_name: row.users?.full_name ?? null,
                email: row.users?.email,
              })),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (entries.length === 0) {
    return <p className="text-sm text-gray-600">No scores yet. Check back once results roll in!</p>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3 text-right">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry, index) => (
            <tr key={entry.user_id}>
              <td className="px-4 py-3 font-medium text-gray-900">{index + 1}</td>
              <td className="px-4 py-3 text-gray-700">
                {entry.full_name || entry.email || "Anonymous"}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-indigo-700">
                {Math.round(entry.total_points * 100) / 100}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
