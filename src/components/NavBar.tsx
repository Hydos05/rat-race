"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NavBar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight text-indigo-700">
          🐀 Rat Race
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/predict" className="hover:text-indigo-700">
            Predict
          </Link>
          <Link href="/leaderboard" className="hover:text-indigo-700">
            Leaderboard
          </Link>
          {!loading && email && (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-gray-500 hover:text-indigo-700"
            >
              Sign out ({email})
            </button>
          )}
          {!loading && !email && (
            <>
              <Link href="/login" className="hover:text-indigo-700">
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
