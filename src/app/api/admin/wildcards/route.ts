import { NextResponse } from "next/server";
import { createAdminClient, isValidAdminKey } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !isValidAdminKey(body.adminKey)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  const { eventId, wildcardsAllowed } = body;
  if (typeof eventId !== "string" || !eventId || typeof wildcardsAllowed !== "boolean") {
    return NextResponse.json({ error: "eventId and wildcardsAllowed are required." }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("events").update({ wildcards_allowed: wildcardsAllowed }).eq("id", eventId).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
