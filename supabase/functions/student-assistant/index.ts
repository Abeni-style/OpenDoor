import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, reply, rateLimit } from "../_shared/mod.ts";

const SYSTEM = `You are OpenDoor Guide, a careful assistant for students worldwide.
Help with educational opportunities, applications, study skills, career readiness, and using OpenDoor.
Rules:
- Do not invent program eligibility, open dates, deadlines, funding, selection rates, or current availability.
- For a specific program or current cycle, explain that users must check the provider's official website unless verified facts are supplied in the conversation.
- Never guarantee admission, scholarships, internships, prizes, or jobs.
- Do not ask users for passwords, exact birth dates, home addresses, passport numbers, financial information, school IDs, or other sensitive personal data.
- Users may be minors. Keep the tone age-appropriate and encourage a trusted adult, teacher, or guardian for consequential decisions, contracts, fees, or safety concerns.
- Do not provide medical, legal, financial-investment, or crisis counseling. Direct users to qualified professionals or trusted adults where appropriate.
- Keep answers practical, specific, and reasonably concise. If unsure, say so.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const message = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const verifiedIds = Array.isArray(body.verified_ids) ? body.verified_ids.slice(0,5).filter((id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)) : [];
    if (!message || message.length > 3000) return reply({ error: "Message must be between 1 and 3,000 characters." }, 400);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!supabaseUrl || !serviceKey || !apiKey) return reply({ error: "The assistant has not been configured by the site administrator yet." }, 503);
    const admin = createClient(supabaseUrl, serviceKey);
    if (!(await rateLimit(admin, req, "assistant-minute", 8, 60_000)) || !(await rateLimit(admin, req, "assistant-day", 40, 86_400_000))) {
      return reply({ error: "Usage limit reached. Please try again later." }, 429);
    }
    const safeHistory = history.filter((x: any) => ["user", "assistant"].includes(x?.role) && typeof x?.content === "string")
      .map((x: any) => ({ role: x.role, content: x.content.slice(0, 2000) }));
    let verifiedRecords: any[] = [];
    if (verifiedIds.length) {
      const { data, error } = await admin.from("opportunities")
        .select("title,provider,category,description,official_url,deadline,funding_type,eligible_countries,min_age,max_age")
        .eq("status", "verified").in("id", verifiedIds).limit(5);
      if (!error && Array.isArray(data)) verifiedRecords = data;
    }
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.3, max_tokens: 650,
        messages: [{ role: "system", content: SYSTEM }, ...(verifiedRecords.length ? [{ role: "system", content: "The following facts were retrieved directly from OpenDoor rows marked verified. Do not add details that are not present; direct the student to the official URL: " + JSON.stringify(verifiedRecords).slice(0,3500) }] : []), ...safeHistory, { role: "user", content: message }] })
    });
    clearTimeout(timeout);
    const result = await response.json();
    if (!response.ok) return reply({ error: "The AI provider could not complete the request. Please try again." }, 502);
    const answer = result?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) return reply({ error: "The assistant returned an empty response." }, 502);
    return reply({ answer: answer.trim(), model, disclaimer: "Check official providers for current eligibility and deadlines." });
  } catch (error) {
    console.error("student-assistant error", String(error).slice(0, 300));
    return reply({ error: "The assistant is temporarily unavailable. Please try again." }, 500);
  }
});
