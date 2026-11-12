import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PredictionForm from "@/app/predict/PredictionForm";
import type { Prediction, RatRaceEvent } from "@/types/database";

export default async function PredictPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .order("display_order", { ascending: true });

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", user.id);

  const { data: settings, error: settingsError } = await supabase
    .from("competition_settings")
    .select("submissions_open")
    .eq("id", true)
    .single();

  return (
    <PredictionForm
      userId={user.id}
      events={(events as RatRaceEvent[]) ?? []}
      existingPredictions={(predictions as Prediction[]) ?? []}
      submissionsOpen={settings?.submissions_open === true}
      loadError={eventsError?.message ?? predictionsError?.message ?? settingsError?.message ?? null}
    />
  );
}
