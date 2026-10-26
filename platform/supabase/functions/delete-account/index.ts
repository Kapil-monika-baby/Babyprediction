import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function missingMemorySchema(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function storagePath(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim();
  const marker = "/storage/v1/object/public/game-images/";
  const at = input.indexOf(marker);
  if (at >= 0) return decodeURIComponent(input.slice(at + marker.length).split("?")[0]);
  if (/^https?:\/\//i.test(input)) return null;
  return input.replace(/^\/+/, "");
}

async function removeStoragePaths(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  paths: string[],
): Promise<void> {
  // Keep each request bounded; retrying after a partial failure is safe because
  // the database rows remain until every batch has completed successfully.
  const batchSize = 100;
  for (let index = 0; index < paths.length; index += batchSize) {
    const batch = paths.slice(index, index + batchSize);
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) throw error;
  }
}


const PAGE_SIZE = 500;
const ID_CHUNK_SIZE = 100;

type QueryError = { code?: string; message?: string };

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: QueryError | null }>,
): Promise<{ data: T[] | null; error: QueryError | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { data: rows, error: null };
  }
}

function chunks<T>(values: T[], size = ID_CHUNK_SIZE): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
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
    // Page every query: PostgREST applies a default row cap, so a single select
    // can silently miss data and leave media behind during account deletion.
    const timelineResult = await fetchAllRows<{ id: string }>((from, to) =>
      admin.from("memory_timelines").select("id").eq("owner_id", user.id).range(from, to));
    if (timelineResult.error && !missingMemorySchema(timelineResult.error)) throw timelineResult.error;
    const timelineIds = (timelineResult.data ?? []).map((row) => row.id);
    const timelineIdSet = new Set(timelineIds);

    type MemoryRow = { id: string; timeline_id: string; created_by: string };
    const memoriesById = new Map<string, MemoryRow>();
    const authoredResult = await fetchAllRows<MemoryRow>((from, to) =>
      admin.from("memory_items").select("id,timeline_id,created_by")
        .eq("created_by", user.id).range(from, to));
    if (authoredResult.error && !missingMemorySchema(authoredResult.error)) throw authoredResult.error;
    if (!authoredResult.error) {
      for (const row of authoredResult.data ?? []) memoriesById.set(row.id, row);

      // Query owned timelines in small ID chunks instead of constructing a huge OR
      // expression. Deduplicate authored items that are also in an owned timeline.
      for (const timelineChunk of chunks(timelineIds)) {
        const result = await fetchAllRows<MemoryRow>((from, to) =>
          admin.from("memory_items").select("id,timeline_id,created_by")
            .in("timeline_id", timelineChunk).range(from, to));
        if (result.error) {
          if (!missingMemorySchema(result.error)) throw result.error;
          memoriesById.clear();
          break;
        }
        for (const row of result.data ?? []) memoriesById.set(row.id, row);
      }
    }

    const memories = [...memoriesById.values()];
    const memoryIds = memories.map((row) => row.id);
    if (memoryIds.length) {
      const mediaPaths: string[] = [];
      let mediaSchemaMissing = false;
      for (const memoryChunk of chunks(memoryIds)) {
        const result = await fetchAllRows<{ storage_path: string }>((from, to) =>
          admin.from("memory_media").select("storage_path")
            .in("memory_id", memoryChunk).range(from, to));
        if (result.error) {
          if (missingMemorySchema(result.error)) {
            mediaSchemaMissing = true;
            break;
          }
          throw result.error;
        }
        mediaPaths.push(...(result.data ?? []).map((row) => row.storage_path));
      }
      // If the media table is not installed there are no media rows to enumerate.
      if (!mediaSchemaMissing && mediaPaths.length) {
        await removeStoragePaths(admin, "memory-media", [...new Set(mediaPaths)]);
      }

      const foreignMemoryIds = memories
        .filter((row) => row.created_by === user.id && !timelineIdSet.has(row.timeline_id))
        .map((row) => row.id);
      for (const idChunk of chunks(foreignMemoryIds)) {
        const { error: deleteItemsError } = await admin.from("memory_items").delete().in("id", idChunk);
        if (deleteItemsError) throw deleteItemsError;
      }
    }

    for (const timelineChunk of chunks(timelineIds)) {
      const { error: deleteTimelinesError } = await admin.from("memory_timelines").delete().in("id", timelineChunk);
      if (deleteTimelinesError && !missingMemorySchema(deleteTimelinesError)) throw deleteTimelinesError;
    }
    const { error: membershipsError } = await admin.from("memory_members").delete().eq("user_id", user.id);
    if (membershipsError && !missingMemorySchema(membershipsError)) throw membershipsError;

    const gamesResult = await fetchAllRows<{ id: string; welcome_background_path?: string | null }>((from, to) =>
      admin.from("games").select("id,welcome_background_path").eq("owner_id", user.id).range(from, to));
    if (gamesResult.error) throw gamesResult.error;
    const games = gamesResult.data ?? [];
    const gameIds = games.map((game) => game.id);
    const paths = new Set<string>();
    for (const game of games) {
      const path = storagePath(game.welcome_background_path);
      if (path) paths.add(path);
    }
    for (const gameChunk of chunks(gameIds)) {
      const questionsResult = await fetchAllRows<{ background_path?: string | null }>((from, to) =>
        admin.from("game_questions").select("background_path").in("game_id", gameChunk).range(from, to));
      if (questionsResult.error) throw questionsResult.error;
      for (const question of questionsResult.data ?? []) {
        const path = storagePath(question.background_path);
        if (path) paths.add(path);
      }
    }
    if (paths.size) {
      await removeStoragePaths(admin, "game-images", [...paths]);
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
