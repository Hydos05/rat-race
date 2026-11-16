"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setPassword("");
      setConfirmation("");
      setSaved(true);
    } catch (err) {
      console.error("Password update failed:", err);
      setError("Could not update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (saved) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm text-green-400">Your password has been updated.</p>
        <Link href="/predict" className="text-sm text-cyan-400 hover:underline">Continue to predictions</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-200">New password</label>
        <input
          id="password" type="password" autoComplete="new-password" required minLength={6}
          value={password} onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200">Confirm new password</label>
        <input
          id="confirmPassword" type="password" autoComplete="new-password" required minLength={6}
          value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <button
        type="submit" disabled={loading}
        className="w-full bg-cyan-500 text-black py-2.5 rounded-md font-medium hover:bg-cyan-400 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Update password"}
      </button>
    </form>
  );
}
