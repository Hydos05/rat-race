import Link from "next/link";
import { RAT_RACE_EVENTS } from "@/data/events";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div className="space-y-8">
      <section className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-100">
          Welcome to the Rat Race 🐀
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Predict the winners of {RAT_RACE_EVENTS.length}+ sporting events across AFL, cricket,
          American football, basketball, soccer, rugby, tennis, golf and more.{" "}
          <Link href="/predict" className="text-cyan-400 underline hover:text-cyan-300">
            Make your picks
          </Link>{" "}
          and each event is worth 100 points, split equally among everyone who picks the winner.
          Submissions close <strong>20 September 2026</strong>.
        </p>
        {!isLoggedIn && (
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="bg-cyan-500 text-black px-5 py-2.5 rounded-md font-medium hover:bg-cyan-400"
            >
              Sign up to enter
            </Link>
            <Link
              href="/leaderboard"
              className="border border-gray-700 px-5 py-2.5 rounded-md font-medium text-gray-100 hover:bg-gray-800"
            >
              View leaderboard
            </Link>
          </div>
        )}
        {isLoggedIn && (
          <div className="space-y-3">
            <p className="text-gray-100 font-medium">
              Welcome back! Ready to make your predictions?
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/predict"
                className="bg-cyan-500 text-black px-5 py-2.5 rounded-md font-medium hover:bg-cyan-400"
              >
                Make your picks
              </Link>
              <Link
                href="/leaderboard"
                className="border border-gray-700 px-5 py-2.5 rounded-md font-medium text-gray-100 hover:bg-gray-800"
              >
                View leaderboard
              </Link>
            </div>
          </div>
        )}
      </section>

      {!isLoggedIn && (
        <section className="grid sm:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5">
            <h2 className="font-semibold text-cyan-400">1. Sign up</h2>
            <p className="text-sm text-gray-300 mt-1">
              Create a free account with your email and password.
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5">
            <h2 className="font-semibold text-cyan-400">2. Make your picks</h2>
            <p className="text-sm text-gray-300 mt-1">
              Choose a favourite from the dropdown, or add your own answer for every event before
              the deadline.
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-5">
            <h2 className="font-semibold text-cyan-400">3. Watch the leaderboard</h2>
            <p className="text-sm text-gray-300 mt-1">
              As results come in, points are split among everyone who picked the winner.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
