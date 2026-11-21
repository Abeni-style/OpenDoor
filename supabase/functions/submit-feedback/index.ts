import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, reply, rateLimit } from "../_shared/mod.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!, serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    if (!(await rateLimit(admin, req, "feedback-hour", 5, 3_600_000))) return reply({ error: "Feedback limit reached. Try again later." }, 429);
    const body = await req.json();
    const topic = String(body.topic || "").trim().slice(0, 80);
    const comment = String(body.comment || "").trim();
    const rating = Number(body.rating);
    if (!topic || comment.length < 8 || comment.length > 700 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return reply({ error: "Please provide a topic, an 8–700 character comment and a rating from 1 to 5." }, 400);
    }
    if (/(password|passport|credit card|bank account|home address|phone number)/i.test(comment)) {
      return reply({ error: "Please remove personal or sensitive information before submitting feedback." }, 400);
    }
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    let userId = null;
    if (token) {
      const { data } = await admin.auth.getUser(token);
      userId = data?.user?.id || null;
    }
    const { error } = await admin.from("feedback").insert({ topic, comment, rating, user_id: userId, status: "pending" });
    if (error) throw error;
    return reply({ success: true, status: "pending", message: "Thank you. Your feedback has been submitted for moderation." }, 201);
  } catch (error) {
    console.error("submit-feedback error", String(error).slice(0, 300));
    return reply({ error: "Feedback could not be submitted. Please try again." }, 500);
  }
});
