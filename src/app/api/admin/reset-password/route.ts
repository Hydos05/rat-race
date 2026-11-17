import { NextResponse } from "next/server";
import { createAdminClient, isValidAdminKey } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("adminKey" in body) || !isValidAdminKey(body.adminKey)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }
  if (
    !("userId" in body) ||
    typeof body.userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.userId) ||
    !("password" in body) ||
    typeof body.password !== "string" ||
    body.password.length < 12 ||
    !body.password.trim()
  ) {
    return NextResponse.json(
      { error: "A valid user and a password of at least 12 characters are required." },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(body.userId, {
      password: body.password,
    });
    if (error) {
      console.error("Admin password reset failed:", { code: error.code, status: error.status });
      return NextResponse.json(
        { error: "Password reset failed. Check the user and Supabase password requirements, then try again." },
        { status: error.status && error.status >= 400 && error.status < 500 ? 400 : 500 },
      );
    }
    return NextResponse.json({ success: true });
  } catch {
    console.error("Admin password reset failed unexpectedly.");
    return NextResponse.json({ error: "Password reset failed. Please try again." }, { status: 500 });
  }
}
