import { NextResponse } from "next/server";
import { createAdminClient, isValidAdminKey } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !isValidAdminKey(body.adminKey)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  const { eventId, startsAt } = body;
  if (typeof eventId !== "string" || !eventId ||
      (startsAt !== null && (typeof startsAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(startsAt) ||
        Number.isNaN(Date.parse(startsAt))))) {
    return NextResponse.json({ error: "A valid event and UTC start time are required." }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("events").update({ starts_at: startsAt }).eq("id", eventId).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
