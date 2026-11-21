import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, reply, rateLimit } from "../_shared/mod.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!, anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get("STRIPE_PREMIUM_PRICE_ID"), siteUrl = Deno.env.get("FRONTEND_ORIGIN");
    if (!stripeKey || !priceId || !siteUrl) return reply({ error: "Premium checkout is not configured." }, 503);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token || token === anonKey) return reply({ error: "Sign in with an email code before continuing." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await userClient.auth.getUser(token);
    if (!userData?.user) return reply({ error: "Your sign-in session has expired. Sign in again." }, 401);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profileError } = await admin.from("user_profiles").select("billing_eligible").eq("user_id", userData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.billing_eligible) return reply({ error: "Paid checkout is disabled until an administrator confirms adult/guardian authorization and the applicable legal requirements." }, 403);
    if (!(await rateLimit(admin, req, "checkout-hour", 3, 3_600_000))) return reply({ error: "Too many checkout attempts. Try again later." }, 429);
    const form = new URLSearchParams();
    form.set("mode", "subscription"); form.set("line_items[0][price]", priceId); form.set("line_items[0][quantity]", "1");
    form.set("success_url", `${siteUrl}/?billing=success`); form.set("cancel_url", `${siteUrl}/?billing=cancelled`);
    form.set("client_reference_id", userData.user.id); form.set("metadata[user_id]", userData.user.id);
    form.set("subscription_data[metadata][user_id]", userData.user.id);
    form.set("customer_email", userData.user.email || "");
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    const result = await res.json();
    if (!res.ok || !result.url) return reply({ error: "The payment provider could not start checkout." }, 502);
    return reply({ checkout_url: result.url });
  } catch (error) {
    console.error("create-checkout error", String(error).slice(0, 300));
    return reply({ error: "Checkout could not be started." }, 500);
  }
});
