# Telegram intake function

This endpoint accepts authenticated Telegram webhook updates from allow-listed maintainers or an owner-authorized channel. Configure `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `TELEGRAM_ALLOWED_CHAT_IDS` as Supabase Edge Function secrets.

It requires a message containing text/caption plus an HTTPS URL or a public forwarded-channel post URL. It stores a candidate in `opportunity_candidates` with `review_status=pending_review`; it never publishes. See `backend/README.md` for setup and moderation steps.
