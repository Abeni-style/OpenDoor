# OpenDoor deployment checklist

## A. Preview website
- [ ] Unzip the release and run `python -m http.server 8000`.
- [ ] Confirm homepage, catalogue, matcher, academy, planner, feedback and plans pages render.
- [ ] Confirm the AI chat explicitly says Preview mode until backend config exists.
- [ ] Confirm no private keys exist in frontend files.

## B. Supabase
- [ ] An authorized adult/organization creates and owns the project.
- [ ] Run `supabase/migrations/0001_global_backend.sql`.
- [ ] Run `supabase/seed_discovery_candidates.sql`; records enter pending review, not the public listings.
- [ ] Run `supabase/seed_discovery_candidates.sql` to import initial records as pending review, not public listings.
- [ ] Enable email OTP. Review abuse protection and email templates.
- [ ] Add only the public URL and anon key to `backend-config.js`.
- [ ] Configure secrets using `supabase secrets set`; never commit them.
- [ ] Deploy all five Edge Functions.
- [ ] Test rate limits, authentication, permissions and CORS.

## C. AI assistant
- [ ] Configure an AI API key in Edge Function secrets.
- [ ] Confirm provider age/terms eligibility, data retention and processing terms for the intended student audience.
- [ ] Test prompt injection, privacy reminders, hallucination handling and rate limits.
- [ ] Confirm chat history is not written to OpenDoor's database.

## D. Reviews
- [ ] Test that user feedback is pending by default.
- [ ] Test that pending/rejected reviews are not publicly readable.
- [ ] Establish moderators and a response/removal process.

## E. Premium
- [ ] Do not activate payment for minor-operated accounts.
- [ ] Secure adult/guardian-controlled business and payment ownership.
- [ ] Verify local Stripe/payment-provider availability, tax, refunds, cancellations, pricing and consumer protection requirements.
- [ ] Configure hosted checkout and webhook.
- [ ] Keep billing_eligible=false until a qualified administrator has completed the required review.

## F. Opportunity ingestion
- [ ] Review each provider's feed terms and data reuse permission.
- [ ] Set feed URLs only for feeds with permission and terms_reviewed=yes.
- [ ] Enable sources only after human approval.
- [ ] Configure GitHub Actions secrets for optional candidate ingestion.
- [ ] Check the pending candidate queue; verify every record manually before publication.

## G. Public launch gates
- [ ] Privacy notice and data retention/deletion workflow.
- [ ] Terms, acceptable use and complaint/reporting process.
- [ ] Minor/guardian protections appropriate to each region.
- [ ] Accessibility and security review.
- [ ] Backup, monitoring and incident response.
- [ ] Human review of every live opportunity record.


## H. Telegram opportunity intake
- [ ] Create an OpenDoor bot with Telegram BotFather.
- [ ] Add server-only TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET.
- [ ] Get maintainer chat IDs with /id and configure TELEGRAM_ALLOWED_CHAT_IDS.
- [ ] Deploy `telegram-intake` and configure the webhook.
- [ ] Test a forwarded post and confirm it enters `opportunity_candidates` as `pending_review`.
- [ ] Ask the channel owner for permission before enabling direct channel updates.
- [ ] Verify every candidate against the original organizer page before publication.

## H. Telegram opportunity intake
- [ ] Create an OpenDoor Telegram bot.
- [ ] Configure TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and TELEGRAM_ALLOWED_CHAT_IDS as server secrets.
- [ ] Deploy `telegram-intake` and configure its webhook.
- [ ] Forward one test opportunity and confirm it enters the pending-review queue.
- [ ] Ask the source channel owner before enabling direct channel-post access.
- [ ] Verify every candidate against the official organizer page before publication.
