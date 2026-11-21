import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, reply } from "../_shared/mod.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return reply({ error: "Method not allowed" }, 405);
  try {
    const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i, "");
    if(!token || token===anon) return reply({error:"Sign in first."},401);
    const auth=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:userData}=await auth.auth.getUser(token); if(!userData?.user) return reply({error:"Session expired."},401);
    const admin=createClient(url,service);
    const {data,error}=await admin.from("entitlements").select("plan,billing_status,current_period_end").eq("user_id",userData.user.id).maybeSingle();
    if(error) throw error;
    return reply({plan:data?.plan||"free",billing_status:data?.billing_status||"inactive",current_period_end:data?.current_period_end||null});
  } catch(error) { console.error("billing-status",String(error).slice(0,250)); return reply({error:"Could not retrieve entitlement."},500); }
});
