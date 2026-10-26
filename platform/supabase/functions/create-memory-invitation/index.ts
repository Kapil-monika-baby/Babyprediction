import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sha256Hex(value: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)).then((digest) =>
    [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { error: "Please sign in before inviting a family member." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: "Family invitations are temporarily unavailable." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) return json(401, { error: "Your session has expired. Sign in again." });

  let body: { timelineId?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Provide a timeline and the invited person's email address." });
  }

  const timelineId = typeof body.timelineId === "string" ? body.timelineId.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!uuidPattern.test(timelineId)) return json(400, { error: "The selected timeline is invalid." });
  if (email.length > 320 || !emailPattern.test(email)) return json(400, { error: "Enter a valid email address." });
  if (!user.email || user.email.trim().toLowerCase() === email) {
    return json(400, { error: "Enter a different email address for the family member you want to invite." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: timeline, error: timelineError } = await admin
      .from("memory_timelines")
      .select("id,owner_id,title")
      .eq("id", timelineId)
      .maybeSingle();

    if (timelineError) throw timelineError;
    if (!timeline || timeline.owner_id !== user.id) {
      return json(404, { error: "Only the timeline owner can invite family members." });
    }

    // The raw token is returned once to the owner; only its SHA-256 hash is stored.
    // Acceptance is limited to the invited email and the link expires after seven days.
    const rawToken = [...crypto.getRandomValues(new Uint8Array(32))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await admin.from("memory_invitations").insert({
      timeline_id: timeline.id,
      invited_email: email,
      role: "contributor",
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    return json(200, {
      success: true,
      token: rawToken,
      expiresAt,
      timelineTitle: timeline.title,
      invitedEmail: email,
    });
  } catch (error) {
    console.error("Memory invitation creation failed", error);
    return json(500, { error: "We could not create the invitation. Please try again." });
  }
});
