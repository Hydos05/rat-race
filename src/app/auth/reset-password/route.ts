import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL("/reset-password", request.url));
      }
      console.error("Password reset link exchange failed:", error.message);
    } catch (error) {
      console.error("Password reset link exchange failed:", error);
    }
  }
  return NextResponse.redirect(new URL("/reset-password?error=invalid", request.url));
}
