"use client";

import { useState, type FormEvent } from "react";

export default function ResetUserPassword({
  adminKey,
  userId,
  name,
  email,
}: {
  adminKey: string;
  userId: string;
  name: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function close() {
    setOpen(false);
    setPassword("");
    setConfirmation("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 12 || !password.trim()) {
      setError("Password must be at least 12 characters and not just spaces.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    if (!window.confirm(`Reset the password for ${name} (${email})?`)) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey, userId, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not reset the password. Please try again.");
        return;
      }
      close();
      setMessage("Password updated. Share it securely and ask the user to change it after signing in.");
    } catch {
      setError("Could not reset the password. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 border-t border-gray-800 pt-3 space-y-3">
      {message && <p role="status" className="text-sm text-green-300">{message}</p>}
      {!open ? (
        <button
          type="button"
          onClick={() => { setMessage(null); setOpen(true); }}
          className="border border-gray-700 px-3 py-2 rounded-md text-sm text-gray-100 hover:bg-gray-800"
        >
          Reset password
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md space-y-3">
          <p className="text-sm text-gray-300">
            Resetting password for {name} ({email}). Use a unique temporary password of at least
            12 characters. Share it securely and ask the user to change it at /reset-password.
          </p>
          <label className="block text-sm text-gray-200">
            Temporary password
            <input
              type="password" autoComplete="new-password" minLength={12} required
              value={password} onChange={(event) => setPassword(event.target.value)} disabled={saving}
              className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100"
            />
          </label>
          <label className="block text-sm text-gray-200">
            Confirm temporary password
            <input
              type="password" autoComplete="new-password" minLength={12} required
              value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={saving}
              className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100"
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-cyan-500 text-black px-3 py-2 rounded-md text-sm font-medium hover:bg-cyan-400 disabled:opacity-60">
              {saving ? "Saving..." : "Set password"}
            </button>
            <button type="button" disabled={saving} onClick={close} className="border border-gray-700 px-3 py-2 rounded-md text-sm text-gray-100 hover:bg-gray-800 disabled:opacity-60">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
