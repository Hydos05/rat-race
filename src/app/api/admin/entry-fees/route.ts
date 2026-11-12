import { NextResponse } from "next/server";
import { createAdminClient, isValidAdminKey } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !isValidAdminKey(body.adminKey)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }
  if (
    typeof body.userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.userId) ||
    typeof body.paid !== "boolean"
  ) {
    return NextResponse.json({ error: "A valid userId and paid boolean are required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("entry_fees")
    .upsert({ user_id: body.userId, paid: body.paid }, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "23503" ? 404 : 500 },
    );
  }
  return NextResponse.json({ success: true });
}
