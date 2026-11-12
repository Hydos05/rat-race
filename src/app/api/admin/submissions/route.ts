import { NextResponse } from "next/server";
import { createAdminClient, isValidAdminKey } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !isValidAdminKey(body.adminKey)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }
  if (typeof body.submissionsOpen !== "boolean") {
    return NextResponse.json({ error: "submissionsOpen must be a boolean." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("competition_settings")
    .update({ submissions_open: body.submissionsOpen })
    .eq("id", true)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
