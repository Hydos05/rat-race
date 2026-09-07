import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    // Use service_role key for admin operations (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user to verify they're accessing this
    const supabaseAuth = await import("@/lib/supabase/server").then((m) => m.createClient());
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Fetch all users from public.users table with their full names
    const { data: publicUsers, error: usersError } = await supabase
      .from("users")
      .select("id, full_name, email");

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    console.log("Public users fetched:", publicUsers);

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

    // Create event map
    const eventMap = new Map((events || []).map((e) => [e.id, e.name]));

    // Group predictions by user
    interface UserPredictions {
      fullName: string;
      email?: string;
      predictions: Array<{
        id: string;
        event_id: string;
        selected_option: string;
        is_locked: boolean;
        eventName?: string;
      }>;
    }

    const userMap = new Map<string, UserPredictions>();

    // Initialize all users (including those without predictions)
    for (const publicUser of publicUsers || []) {
      userMap.set(publicUser.id, {
        fullName: publicUser.full_name || publicUser.email || "Unknown User",
        email: publicUser.email,
        predictions: [],
      });
    }

    console.log("User map initialized:", userMap);

    // Add predictions to users
    for (const prediction of predictions || []) {
      const userData = userMap.get(prediction.user_id);
      if (userData) {
        userData.predictions.push({
          id: prediction.id,
          event_id: prediction.event_id,
          selected_option: prediction.selected_option,
          is_locked: prediction.is_locked,
          eventName: eventMap.get(prediction.event_id),
        });
      }
    }

    // Convert to array and sort by full name
    const result = Array.from(userMap.entries())
      .map(([userId, data]) => ({
        userId,
        fullName: data.fullName,
        email: data.email,
        predictions: data.predictions,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    console.log("Final result:", result);

    return Response.json(result);
  } catch (error) {
    console.error("Error fetching users:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 },
    );
  }
}
