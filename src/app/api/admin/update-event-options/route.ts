import { NextResponse } from "next/server";
import { createAdminClient, isValidAdminKey } from "@/lib/supabase/admin";
import { cleanOptions } from "@/lib/eventOptions";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !isValidAdminKey(body.adminKey)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  const { eventId, options } = body as { eventId?: unknown; options?: unknown };

  if (!eventId || typeof eventId !== "string") {
    return NextResponse.json({ error: "eventId is required." }, { status: 400 });
  }

  if (!Array.isArray(options) || options.some((option) => typeof option !== "string")) {
    return NextResponse.json({ error: "options must be an array of strings." }, { status: 400 });
  }

  const cleanedOptions = cleanOptions(options);

  if (cleanedOptions.length === 0) {
    return NextResponse.json(
      { error: "At least one non-empty option is required." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .update({ options: cleanedOptions })
    .eq("id", eventId)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

