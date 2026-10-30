/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Sign in to share a memory." });
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(500, { error: "Memory sharing is temporarily unavailable." });
  const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser(authorization.slice(7));
  if (authError || !user) return json(401, { error: "Your session has expired. Sign in again." });
  let body: { memoryId?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: "Select a memory to share." }); }
  const memoryId = typeof body.memoryId === "string" ? body.memoryId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(memoryId)) return json(400, { error: "The selected memory is invalid." });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: memory, error } = await admin.from("memory_items")
      .select("id,timeline_id,deleted_at,memory_timelines!inner(owner_id)")
      .eq("id", memoryId).maybeSingle();
    if (error) throw error;
    const timeline = memory?.memory_timelines as unknown as { owner_id: string } | null;
    if (!memory || memory.deleted_at || timeline?.owner_id !== user.id) return json(404, { error: "Only the timeline owner can share this memory." });
    const rawToken = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: link, error: insertError } = await admin.from("memory_share_links")
      .insert({ memory_id: memoryId, token_hash: tokenHash, created_by: user.id, expires_at: expiresAt })
      .select("id").single();
    if (insertError) throw insertError;
    return json(200, { success: true, shareId: link.id, token: rawToken, expiresAt });
  } catch (error) {
    console.error("Memory share creation failed", error);
    return json(500, { error: "We could not create a share link. Please try again." });
  }
});
