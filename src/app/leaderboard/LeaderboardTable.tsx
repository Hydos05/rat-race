import type { LeaderboardEntry } from "@/types/database";

export default function LeaderboardTable({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">No scores yet. Check back once results roll in!</p>;
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-800 text-left text-gray-400 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3 text-right">Points / possible</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {entries.map((entry, index) => (
            <tr key={entry.user_id}>
              <td className="px-4 py-3 font-medium text-gray-100">{index + 1}</td>
              <td className="px-4 py-3 text-gray-300">
                {entry.full_name || entry.email || "Anonymous"}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-cyan-400 whitespace-nowrap">
                {Math.round(entry.total_points * 100) / 100} /{" "}
                <span className="text-gray-400 italic font-normal">{Math.round(entry.possible_points)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
