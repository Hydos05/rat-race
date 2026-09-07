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
    <header className="bg-gray-950 border-b border-gray-800">
      <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight text-cyan-400">
          🐀 Rat Race
        </Link>
        <div className="flex items-center gap-4 text-sm text-gray-100">
          <Link href="/predict" className="hover:text-cyan-400">
            Predict
          </Link>
          <Link href="/leaderboard" className="hover:text-cyan-400">
            Leaderboard
          </Link>
          {!loading && email && (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-gray-400 hover:text-cyan-400"
            >
              Sign out ({email})
            </button>
          )}
          {!loading && !email && (
            <>
              <Link href="/login" className="hover:text-cyan-400">
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-cyan-500 text-black px-3 py-1.5 rounded-md font-medium hover:bg-cyan-400"
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
