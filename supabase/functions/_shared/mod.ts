const frontendOrigin = Deno.env.get("FRONTEND_ORIGIN") || "http://localhost:8000";
const corsHeaders = {
  "Access-Control-Allow-Origin": frontendOrigin,
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret, stripe-signature",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json",
};
function reply(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: corsHeaders }); }
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function rateLimit(supabase: any, request: Request, scope: string, max: number, windowMs: number) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unavailable";
  const hash = await sha256(ip + (Deno.env.get("RATE_LIMIT_PEPPER") || "opendoor"));
  const start = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_key_hash: hash, p_scope: scope, p_window_start: start, p_limit: max
  });
  if (error) throw error;
  return data === true;
}
