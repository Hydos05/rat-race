import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all predictions
    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("*");

    if (predictionsError) throw predictionsError;

    // Fetch all events
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, name");

    if (eventsError) throw eventsError;

    // Get current user to verify they're accessing this
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Create event map
    const eventMap = new Map((events || []).map((e) => [e.id, e.name]));

    // Group predictions by user
    interface UserPredictions {
      [key: string]: {
        userEmail: string;
        predictions: Array<{
          id: string;
          event_id: string;
          selected_option: string;
          is_locked: boolean;
          eventName?: string;
        }>;
      };
    }

    const userMap: UserPredictions = {};

    for (const prediction of predictions || []) {
      if (!userMap[prediction.user_id]) {
        userMap[prediction.user_id] = {
          userEmail: "",
          predictions: [],
        };
      }

      userMap[prediction.user_id].predictions.push({
        id: prediction.id,
        event_id: prediction.event_id,
        selected_option: prediction.selected_option,
        is_locked: prediction.is_locked,
        eventName: eventMap.get(prediction.event_id),
      });
    }

    // Convert to array and sort by user ID
    const result = Object.entries(userMap)
      .map(([userId, data]) => ({
        userId,
        userEmail: data.userEmail || `User ${userId.substring(0, 8)}`,
        predictions: data.predictions,
      }))
      .sort((a, b) => a.userEmail.localeCompare(b.userEmail));

    return Response.json(result);
  } catch (error) {
    console.error("Error fetching users:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 },
    );
  }
}
