import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  return (
    <div className="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-5">
      <h1 className="text-2xl font-bold text-gray-100">Reset password</h1>
      {error || authError || !user ? (
        <>
          <p role="alert" className="text-sm text-red-400">
            This reset link is invalid or has expired. Request a new link and open it in the same browser.
          </p>
          <Link href="/forgot-password" className="text-sm text-cyan-400 hover:underline">
            Request a new reset link
          </Link>
        </>
      ) : (
        <ResetPasswordForm />
      )}
    </div>
  );
}
