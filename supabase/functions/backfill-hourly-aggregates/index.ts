import { getServiceClient } from "../_shared/supabaseClient.ts";

// Workspace TypeScript may not have Deno types; declare to satisfy editor.
declare const Deno: any;

const supabase = getServiceClient();

Deno.serve(async (req: Request) => {
  try {
    console.log("[backfill-hourly-aggregates] Starting backfill...");

    // Fetch all wars
    const { data: wars, error: warsError } = await supabase
      .from("wars")
      .select("warNumber")
      .order("warNumber", { ascending: false });

    if (warsError) {
      throw new Error(`Failed to fetch wars: ${warsError.message}`);
    }

    console.log(`[backfill-hourly-aggregates] Found ${wars.length} wars`);

    // For each war, compute all hourly aggregates
    for (const war of wars) {
      console.log(`[backfill-hourly-aggregates] Processing war ${war.warNumber}...`);

      // Fetch all snapshots for this war
      const { data: snapshots, error: snapshotError } = await supabase
        .from("snapshots")
        .select("*")
        .eq("war_number", war.warNumber)
        .order("created_at", { ascending: true });

      if (snapshotError) {
        console.error(`Failed to fetch snapshots for war ${war.warNumber}: ${snapshotError.message}`);
        continue;
      }

      if (!snapshots || snapshots.length === 0) {
        console.log(`[backfill-hourly-aggregates] No snapshots for war ${war.warNumber}`);
        continue;
      }

      console.log(`[backfill-hourly-aggregates] War ${war.warNumber}: ${snapshots.length} snapshots`);

      // Call aggregate-hourly-summaries for each day of the war
      const daysProcessed = new Set<string>();
      for (const snapshot of snapshots) {
        const date = new Date(snapshot.created_at).toISOString().split("T")[0];
        if (daysProcessed.has(date)) continue;
        daysProcessed.add(date);

        // Trigger aggregation for this day
        const result = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/aggregate-hourly-summaries`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              warNumber: war.warNumber,
              dateUtc: date,
            }),
          }
        );

        const resultBody = await result.json();
        console.log(`[backfill-hourly-aggregates] War ${war.warNumber}, date ${date}: ${resultBody.message}`);
      }
    }

    console.log("[backfill-hourly-aggregates] Backfill complete");
    return new Response(JSON.stringify({ message: "Backfill completed successfully" }), { status: 200 });
  } catch (error) {
    console.error("[backfill-hourly-aggregates] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});
