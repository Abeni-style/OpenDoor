import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Telegram opportunity intake.
 * Accepts either:
 *  - posts forwarded by an allow-listed maintainer to the bot in a private chat; or
 *  - channel_post updates from a channel where the bot has been added with permission.
 * Every item is inserted into opportunity_candidates as pending_review. Nothing is published.
 */
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});

function cleanUrl(value: string): string {
  return value.replace(/[),.!?]+$/g, "");
}

function collectUrls(message: any, text: string): string[] {
  const urls = new Set<string>();
  const entities = [...(message.entities || []), ...(message.caption_entities || [])];
  for (const entity of entities) {
    if (entity.type === "text_link" && entity.url) urls.add(cleanUrl(String(entity.url)));
    if (entity.type === "url") {
      // Telegram entity offsets use UTF-16 code units, matching JavaScript string slicing.
      const candidate = text.slice(entity.offset, entity.offset + entity.length);
      if (candidate) urls.add(cleanUrl(candidate));
    }
  }
  for (const match of text.match(/https?:\/\/[^\s<>"']+/g) || []) urls.add(cleanUrl(match));
  return [...urls].filter((u) => /^https:\/\//i.test(u));
}

function channelPostUrl(message: any): string | null {
  const origin = message.forward_origin;
  if (origin?.type === "channel" && origin.chat?.username && origin.message_id) {
    return `https://t.me/${origin.chat.username}/${origin.message_id}`;
  }
  const legacy = message.forward_from_chat;
  if (legacy?.username && message.forward_from_message_id) {
    return `https://t.me/${legacy.username}/${message.forward_from_message_id}`;
  }
  return null;
}

function guessCategory(text: string): string {
  const t = text.toLowerCase();
  if (/scholarship|financial aid|grant|tuition/.test(t)) return "Scholarship";
  if (/internship|intern /.test(t)) return "Internship";
  if (/research|fellowship/.test(t)) return "Research";
  if (/summer school|summer program|summer camp/.test(t)) return "Summer Program";
  if (/hackathon|competition|challenge|contest/.test(t)) return "Competition";
  if (/conference|assembly|summit/.test(t)) return "Conference / Youth Program";
  if (/course|bootcamp|training|workshop/.test(t)) return "Course / Training";
  return "Other";
}

function parseCandidate(message: any) {
  const text = String(message.text || message.caption || "").trim().slice(0, 12000);
  if (!text) return { error: "The forwarded post has no text or caption. Please forward the post with its announcement text." };
  const urls = collectUrls(message, text);
  // Prefer the organizer/application link over a Telegram share link.
  const external = urls.find((u) => !/^https:\/\/t\.me\//i.test(u));
  const sourcePost = channelPostUrl(message);
  const officialUrl = external || sourcePost || urls[0];
  if (!officialUrl) return { error: "No HTTPS link was found. Forward the original post with its official announcement/application link, or include that link in your message." };

  const lines = text.split(/\r?\n/).map((x: string) => x.trim()).filter(Boolean);
  const title = (lines.find((line: string) => !/^https?:\/\//i.test(line) && line.length > 3) || "Opportunity announcement").slice(0, 220);
  const origin = message.forward_origin;
  const legacy = message.forward_from_chat;
  const provider = origin?.chat?.title || legacy?.title || "Telegram opportunity submission";
  const applicationUrl = external || "";
  return {
    record: {
      title,
      provider,
      category: guessCategory(text),
      description: text.slice(0, 1600),
      official_url: officialUrl,
      raw_record: {
        intake_method: "telegram_bot",
        telegram_chat_id: String(message.chat?.id ?? ""),
        telegram_message_id: message.message_id ?? null,
        forwarded_channel: provider,
        forwarded_channel_username: origin?.chat?.username || legacy?.username || null,
        source_post_url: sourcePost,
        extracted_links: urls,
        application_url_candidate: applicationUrl,
        raw_text: text,
        review_instructions: "Check the original organizer page. Confirm age, eligible countries, education level, funding, fee, opening date and deadline. Replace the Telegram post URL with the official provider page before publication.",
      },
      review_status: "pending_review",
    },
  };
}

async function sendReply(token: string, chatId: number | string, text: string) {
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (error) {
    console.error("Telegram reply failed", String(error).slice(0, 160));
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const expectedSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
  const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!expectedSecret || receivedSecret !== expectedSecret) return json({ error: "Unauthorized" }, 401);

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  const allowed = new Set((Deno.env.get("TELEGRAM_ALLOWED_CHAT_IDS") || "")
    .split(",").map((x) => x.trim()).filter(Boolean));
  if (!botToken) return json({ error: "Telegram bot is not configured" }, 503);

  try {
    const update = await req.json();
    const message = update.message || update.channel_post;
    if (!message) return json({ ok: true, ignored: "unsupported_update" });

    const chatId = String(message.chat?.id ?? "");
    const isPrivate = message.chat?.type === "private";
    const rawText = String(message.text || message.caption || "").trim();

    if (isPrivate && /^\/(start|help|id)(\s|$)/i.test(rawText)) {
      await sendReply(botToken, chatId,
        `OpenDoor Opportunity Intake\nYour Telegram chat ID: ${chatId}\n\nA maintainer must add this ID to TELEGRAM_ALLOWED_CHAT_IDS before you can submit posts. Once approved, forward a public opportunity announcement with its official HTTPS link. Every submission enters a human review queue and is never published automatically.`);
      return json({ ok: true, command: "help" });
    }

    if (!chatId || !allowed.has(chatId)) {
      if (isPrivate) await sendReply(botToken, chatId, "This chat is not approved to submit opportunities. Use /id to get your Telegram ID and ask an OpenDoor administrator to allow it.");
      return json({ error: "Chat is not allow-listed" }, 403);
    }

    const parsed = parseCandidate(message);
    if (parsed.error) {
      if (isPrivate) await sendReply(botToken, chatId, parsed.error);
      return json({ error: parsed.error }, 422);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Database is not configured" }, 503);
    const admin = createClient(url, serviceKey);
    // Per-allow-listed-chat rate limit: 30 accepted announcements per hour.
    const limiterSeed = `${chatId}|${expectedSecret}`;
    const limiterDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(limiterSeed));
    const limiterHash = [...new Uint8Array(limiterDigest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    const windowMs = 60 * 60 * 1000;
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
    const { data: withinLimit, error: limitError } = await admin.rpc("consume_rate_limit", {
      p_key_hash: limiterHash, p_scope: "telegram-intake-hour", p_window_start: windowStart, p_limit: 30,
    });
    if (limitError) throw limitError;
    if (withinLimit !== true) return json({ error: "Telegram intake rate limit exceeded" }, 429);

    const r = parsed.record;
    const fingerprintInput = `${r.provider.toLowerCase()}|${r.title.toLowerCase()}|${r.official_url.toLowerCase()}`;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprintInput));
    const fingerprint = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await admin.from("opportunity_candidates").upsert({
      fingerprint,
      provider: r.provider,
      title: r.title,
      official_url: r.official_url,
      category: r.category,
      description: r.description,
      raw_record: r.raw_record,
      review_status: "pending_review",
    }, { onConflict: "fingerprint", ignoreDuplicates: true });
    if (error) throw error;

    if (isPrivate) await sendReply(botToken, chatId,
      `Received: ${r.title}\nCategory guess: ${r.category}\nStatus: Pending human review. This is not yet a verified or published opportunity. Thank you.`);
    return json({ ok: true, status: "pending_review", title: r.title });
  } catch (error) {
    console.error("telegram-intake error", String(error).slice(0, 300));
    return json({ error: "Telegram intake failed" }, 500);
  }
});
