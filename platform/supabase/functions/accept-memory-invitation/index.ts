/// <reference lib="deno.ns" />
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

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { error: "Sign in with the invited email address to accept this invitation." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return json(500, { error: "Invitation acceptance is temporarily unavailable." });

  const token = authorization.slice("Bearer ".length);
  // Forward the caller's JWT to Postgres so auth.uid() and auth.jwt() are the invitee.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) return json(401, { error: "Your session has expired. Sign in again." });

  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "This invitation link is invalid or expired." });
  }

  const rawToken = typeof body.token === "string" ? body.token.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{64}$/.test(rawToken)) {
    return json(400, { error: "This invitation link is invalid or expired." });
  }

  try {
    const tokenHash = await sha256Hex(rawToken);
    const { data: timelineId, error: acceptError } = await userClient.rpc(
      "accept_memory_invitation",
      { p_token_hash: tokenHash },
    );

    if (acceptError) {
      // Keep token validity and invitation-email details out of the response.
      console.warn("Memory invitation acceptance rejected", acceptError.code);
      return json(400, {
        error: "We couldn't accept this invitation. Check that you're signed in with the invited email and that the link has not expired or already been used.",
      });
    }
    if (typeof timelineId !== "string") {
      return json(500, { error: "The invitation was accepted, but the timeline could not be opened. Visit Memories and try again." });
    }

    return json(200, { success: true, timelineId });
  } catch (error) {
    console.error("Memory invitation acceptance failed", error);
    return json(500, { error: "We could not accept this invitation right now. Please try again." });
  }
});
