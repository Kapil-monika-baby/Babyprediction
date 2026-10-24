import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function storagePath(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim();
  const marker = "/storage/v1/object/public/game-images/";
  const at = input.indexOf(marker);
  if (at >= 0) return decodeURIComponent(input.slice(at + marker.length).split("?")[0]);
  if (/^https?:\/\//i.test(input)) return null;
  return input.replace(/^\/+/, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Please sign in again to delete your account." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Account deletion is temporarily unavailable." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const token = authorization.slice("Bearer ".length);
  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Your session has expired. Sign in again and retry." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    // Memories media is stored outside Postgres, so FK cascades cannot remove objects.
    // Remove objects first; abort on Storage errors so the request can be retried safely.
    const { data: ownedTimelines, error: timelinesError } = await admin
      .from("memory_timelines").select("id").eq("owner_id", user.id);
    if (timelinesError && timelinesError.code !== "42P01") throw timelinesError;
    const timelineIds = (ownedTimelines || []).map((row: { id: string }) => row.id);

    let memoryQuery = admin.from("memory_items").select("id,timeline_id,created_by");
    if (timelineIds.length) {
      memoryQuery = memoryQuery.or(`created_by.eq.${user.id},timeline_id.in.(${timelineIds.join(",")})`);
    } else {
      memoryQuery = memoryQuery.eq("created_by", user.id);
    }
    const { data: memories, error: memoriesError } = await memoryQuery;
    if (memoriesError && memoriesError.code !== "42P01") throw memoriesError;
    const memoryIds = (memories || []).map((row: { id: string }) => row.id);
    if (memoryIds.length) {
      const { data: mediaRows, error: mediaError } = await admin
        .from("memory_media").select("storage_path").in("memory_id", memoryIds);
      if (mediaError && mediaError.code !== "42P01") throw mediaError;
      const paths = (mediaRows || []).map((row: { storage_path: string }) => row.storage_path);
      if (paths.length) {
        const { error: cleanupError } = await admin.storage.from("memory-media").remove(paths);
        if (cleanupError) throw cleanupError;
      }
      const foreignMemoryIds = (memories || [])
        .filter((row: { timeline_id: string; created_by: string }) =>
          row.created_by === user.id && !timelineIds.includes(row.timeline_id))
        .map((row: { id: string }) => row.id);
      if (foreignMemoryIds.length) {
        const { error: deleteItemsError } = await admin.from("memory_items").delete().in("id", foreignMemoryIds);
        if (deleteItemsError) throw deleteItemsError;
      }
    }
    if (timelineIds.length) {
      const { error: deleteTimelinesError } = await admin.from("memory_timelines").delete().in("id", timelineIds);
      if (deleteTimelinesError && deleteTimelinesError.code !== "42P01") throw deleteTimelinesError;
    }
    const { error: membershipsError } = await admin.from("memory_members").delete().eq("user_id", user.id);
    if (membershipsError && membershipsError.code !== "42P01") throw membershipsError;

    const { data: games, error: gamesError } = await admin.from("games").select("id,welcome_background_path").eq("owner_id", user.id);
    if (gamesError) throw gamesError;
    const gameIds = (games || []).map((game: { id: string }) => game.id);
    const paths = new Set<string>();
    for (const game of games || []) {
      const path = storagePath((game as { welcome_background_path?: string }).welcome_background_path);
      if (path) paths.add(path);
    }
    if (gameIds.length) {
      const { data: questions, error: questionsError } = await admin.from("game_questions").select("background_path").in("game_id", gameIds);
      if (questionsError) throw questionsError;
      for (const question of questions || []) {
        const path = storagePath((question as { background_path?: string }).background_path);
        if (path) paths.add(path);
      }
    }
    if (paths.size) {
      const { error: storageError } = await admin.storage.from("game-images").remove([...paths]);
      if (storageError) throw storageError;
    }

    // The profile's FK cascades through owned games, questions, results,
    // predictions and baby records. Never accept a user ID from the client.
    const { error: profileError } = await admin.from("profiles").delete().eq("id", user.id);
    if (profileError) throw profileError;

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id, true);
    if (authDeleteError) throw authDeleteError;

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Account deletion failed for authenticated request", error);
    return new Response(JSON.stringify({ error: "We could not complete deletion right now. Please try again or use the web deletion request page." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
