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
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(500, { error: "Shared memories are temporarily unavailable." });
  let body: { token?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: "This share link is invalid." }); }
  const token = typeof body.token === "string" ? body.token : "";
  if (!/^[0-9a-f]{64}$/i.test(token)) return json(404, { error: "This share link is invalid or has expired." });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const tokenHash = await sha256Hex(token);
    const { data: share, error } = await admin.from("memory_share_links")
      .select("id,memory_items!inner(id,kind,caption,occurred_on,milestone_type,deleted_at)")
      .eq("token_hash", tokenHash).is("revoked_at", null).maybeSingle();
    if (error) throw error;
    if (!share) return json(404, { error: "This share link is invalid or has been revoked." });
    const item = share.memory_items as unknown as { id: string; kind: string; caption: string; occurred_on: string; milestone_type: string | null; deleted_at: string | null };
    const { data: shareRow, error: shareError } = await admin.from("memory_share_links").select("expires_at").eq("id", share.id).single();
    if (shareError) throw shareError;
    if (shareRow.expires_at && new Date(shareRow.expires_at).getTime() <= Date.now()) return json(410, { error: "This share link has expired." });
    if (item.deleted_at) return json(404, { error: "This memory is no longer available." });
    const { data: mediaRows, error: mediaError } = await admin.from("memory_media").select("storage_path,mime_type").eq("memory_id", item.id).limit(1);
    if (mediaError) throw mediaError;
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    if (mediaRows?.[0]) {
      const { data: signed, error: signedError } = await admin.storage.from("memory-media").createSignedUrl(mediaRows[0].storage_path, 300);
      if (signedError) throw signedError;
      mediaUrl = signed.signedUrl; mediaType = mediaRows[0].mime_type;
    }
    return json(200, { memory: { kind: item.kind, caption: item.caption, occurredOn: item.occurred_on, milestone: item.milestone_type, mediaUrl, mediaType } });
  } catch (error) {
    console.error("Shared memory resolution failed", error);
    return json(500, { error: "We could not open this memory. Please try again." });
  }
});
