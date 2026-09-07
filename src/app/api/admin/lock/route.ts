import { NextResponse } from "next/server";
import { createAdminClient, isValidAdminKey } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !isValidAdminKey(body.adminKey)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  const { eventId, locked } = body as { eventId?: string; locked?: boolean };

  if (!eventId || typeof locked !== "boolean") {
    return NextResponse.json({ error: "eventId and locked are required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("events").update({ locked }).eq("id", eventId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
