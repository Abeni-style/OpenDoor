import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, reply, rateLimit } from "../_shared/mod.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const secret = Deno.env.get("OPEN_DOOR_SYNC_SECRET") || "";
    if (!secret || req.headers.get("x-sync-secret") !== secret) return reply({ error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await rateLimit(admin, req, "candidate-ingest-hour", 20, 3_600_000))) return reply({ error: "Ingest rate limit exceeded" }, 429);
    const body = await req.json(), records = Array.isArray(body.records) ? body.records.slice(0, 500) : [];
    if (!records.length) return reply({ error: "Expected records array (max 500)." }, 400);
    const rows = [];
    for (const r of records) {
      const title = String(r.title || "").trim(), url = String(r.official_url || r.url || "").trim(), provider = String(r.provider || "Unknown provider").trim();
      if (!title || !/^https:\/\//i.test(url)) continue;
      const fpData = new TextEncoder().encode(`${provider.toLowerCase()}|${title.toLowerCase()}|${url.toLowerCase()}`);
      const digest = await crypto.subtle.digest("SHA-256", fpData);
      const fingerprint = [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
      rows.push({ fingerprint, provider, title, official_url:url, category:String(r.category||"Other"), description:String(r.description||"").slice(0,1600), raw_record:r, review_status:"pending_review" });
    }
    if (!rows.length) return reply({ error: "No valid HTTPS source-linked candidates were supplied." }, 400);
    const { error } = await admin.from("opportunity_candidates").upsert(rows, { onConflict: "fingerprint", ignoreDuplicates: true });
    if (error) throw error;
    return reply({ accepted: rows.length, status: "pending_review", message: "Candidates were ingested for moderator review; none were auto-published." });
  } catch (error) {
    console.error("ingest-candidates error", String(error).slice(0,300));
    return reply({ error: "Candidate ingestion failed." }, 500);
  }
});
