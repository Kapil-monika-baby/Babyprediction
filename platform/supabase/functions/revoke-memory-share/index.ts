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
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Sign in to manage sharing." });
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(500, { error: "Memory sharing is temporarily unavailable." });
  const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser(authorization.slice(7));
  if (authError || !user) return json(401, { error: "Your session has expired. Sign in again." });
  let body: { shareId?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: "Select a share link to revoke." }); }
  const shareId = typeof body.shareId === "string" ? body.shareId : "";
  if (!/^[0-9a-f-]{36}$/i.test(shareId)) return json(400, { error: "The share link is invalid." });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: link, error } = await admin.from("memory_share_links")
      .select("id,memory_items!inner(memory_timelines!inner(owner_id))").eq("id", shareId).maybeSingle();
    if (error) throw error;
    const item = link?.memory_items as unknown as { memory_timelines: { owner_id: string } } | null;
    if (!link || item?.memory_timelines?.owner_id !== user.id) return json(404, { error: "Share link not found." });
    const { error: updateError } = await admin.from("memory_share_links").update({ revoked_at: new Date().toISOString() }).eq("id", shareId);
    if (updateError) throw updateError;
    return json(200, { success: true });
  } catch (error) {
    console.error("Memory share revocation failed", error);
    return json(500, { error: "We could not revoke this link. Please try again." });
  }
});
