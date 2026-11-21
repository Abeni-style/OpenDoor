import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, reply } from "../_shared/mod.ts";
async function verifyStripeSignature(raw: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map(x => x.split("=", 2)));
  const timestamp = parts.t, signature = parts.v1;
  if (!timestamp || !signature || Math.abs(Date.now()/1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  const expected = [...new Uint8Array(mac)].map(x=>x.toString(16).padStart(2,"0")).join("");
  if (expected.length !== signature.length) return false;
  let diff = 0; for (let i=0;i<expected.length;i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const raw = await req.text(), sig = req.headers.get("stripe-signature") || "", secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    if (!secret || !(await verifyStripeSignature(raw, sig, secret))) return reply({ error: "Invalid webhook signature" }, 400);
    const event = JSON.parse(raw), obj = event.data?.object || {};
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (event.type === "checkout.session.completed" && obj.mode === "subscription") {
      const userId = obj.client_reference_id || obj.metadata?.user_id;
      if (userId) await admin.from("entitlements").upsert({ user_id: userId, plan: "premium", billing_status: "pending_activation", provider: "stripe", customer_id: obj.customer || null, subscription_id: obj.subscription || null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    }
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const userId = obj.metadata?.user_id;
      if (userId) {
        const active = ["active", "trialing"].includes(obj.status);
        await admin.from("entitlements").upsert({ user_id: userId, plan: active ? "premium" : "free", billing_status: obj.status || "inactive", provider: "stripe", customer_id: obj.customer || null, subscription_id: obj.id, current_period_end: obj.current_period_end ? new Date(obj.current_period_end*1000).toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      }
    }
    return reply({ received: true });
  } catch (error) {
    console.error("stripe-webhook error", String(error).slice(0, 300));
    return reply({ error: "Webhook processing failed" }, 500);
  }
});
