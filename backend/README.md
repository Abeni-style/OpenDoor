# OpenDoor backend setup

This repo contains integration-ready Supabase Edge Functions for passwordless accounts, an AI student assistant, moderated feedback, subscription checkout, Stripe webhooks and candidate ingestion.

## What is live in the source vs activated

The functions and SQL are supplied as source code. They are **not deployed** until an administrator creates a Supabase project, runs the migration, configures secrets and deploys the functions. The OpenAI assistant requires a server-side API key and provider account controlled by an appropriate adult/organization. Check model availability, usage billing, privacy, retention and age requirements before activation. Premium checkout requires an adult-owned business/payment account, legal review, published price, refund/cancellation terms and guardian/age safeguards. The schema deliberately sets `billing_eligible=false` for every new profile so checkout is blocked by default.

## 1. Create and configure Supabase

1. Create a Supabase project in an account controlled by an appropriate adult/organization.
2. In SQL Editor, run `supabase/migrations/0001_global_backend.sql`.
3. In SQL Editor, run `supabase/seed_discovery_candidates.sql` to load the initial provider directory as pending-review candidates and register the source watchlist. These records are not public until a human moderator verifies and publishes them.
4. Enable Email OTP in Authentication settings. Configure the email template to send the numeric token (for example `{{ .Token }}`) because the website requests a six-digit code. Disable password sign-in if the project only uses email one-time codes.
5. Copy `backend/backend-config.example.js` to the website root as `backend-config.js`, and set only `SUPABASE_URL` and the public anon key.
6. Set server secrets using the CLI or Dashboard. Never commit service role, AI, Stripe or sync secrets.

Example:

```bash
supabase secrets set RATE_LIMIT_PEPPER="a-long-random-value"
supabase secrets set FRONTEND_ORIGIN=https://your-public-site.example
# Only after an adult/organization approves live AI and provider terms:
supabase secrets set OPENAI_API_KEY="SERVER_SIDE_KEY"
supabase secrets set OPENAI_MODEL="MODEL_AVAILABLE_IN_YOUR_API_ACCOUNT"
```

Supabase supplies its project URL and built-in function keys to Edge Functions in the deployed environment. Confirm the exact names in the project environment. Do not paste a service-role key into the repository, notebook, frontend config or chat, and do not override a built-in secret unless the deployment documentation for your project requires it.

## 2. Deploy functions

From the project root, link your Supabase project, then deploy:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy student-assistant --no-verify-jwt
supabase functions deploy submit-feedback --no-verify-jwt
supabase functions deploy create-checkout --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy ingest-candidates --no-verify-jwt
supabase functions deploy billing-status --no-verify-jwt
supabase functions deploy telegram-intake --no-verify-jwt
```

The functions manually validate user identity, service secrets, Stripe signatures, or sync secrets. `student-assistant` and `submit-feedback` can be used without an account but are rate-limited. Avoid collecting personal information in chat or reviews.

## 3. AI assistant

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL`. The key is used only server-side by `student-assistant`. The client receives only the assistant's text response. Conversations are not stored by this app. Provider-side retention and processing are governed by the selected AI account's terms and settings; review them before serving minors.

## 4. Passwordless accounts

The website requests a one-time email code using Supabase Auth. No password is created. The browser stores the temporary session in `sessionStorage`, not persistent local storage, and refreshes it using the Supabase refresh token while the browser session remains active. User profiles contain only optional display name, country, age band, education level and interests. Do not collect exact birth dates, passport identifiers or sensitive records.

## 5. Verified catalogue delivery

The browser reads only rows with `status=verified` from `public.opportunities`. Candidate rows remain private in `opportunity_candidates`. A moderator must review a candidate, check the official source and then publish a normalized `opportunities` row with `status=verified`, `last_checked` and `verified_by`. The AI assistant receives only this verified catalogue context from the browser; it must still direct students to the official source.

## 6. Public feedback

Public review submissions go to `pending` status and are not publicly visible until approved. A moderator with protected administrative access must review them in Supabase and set `status='approved'`, `moderated_at=now()`, and `moderator_id` appropriately. The public API only selects approved entries. Never publish comments containing personal information, abuse or unverified claims.

## 7. Premium and payment constraints

Stripe checkout is disabled until these server secrets exist:

- `STRIPE_SECRET_KEY`
- `STRIPE_PREMIUM_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_ORIGIN`

Create the Stripe webhook pointing to `/functions/v1/stripe-webhook` and subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.

**Safety gate:** `create-checkout` requires `user_profiles.billing_eligible=true`. New profiles default to false. Do not enable this for a minor. A qualified adult/guardian-controlled billing owner and legal review must be in place first. Payment availability in the organization's country, tax, consumer protection, refunds, cancellation, and privacy requirements must be verified before activation. Do not accept card details directly in OpenDoor.

## 8. Opportunity ingestion

The `ingest-candidates` function accepts source-linked candidates only and stores them as `pending_review`; it never publishes records automatically. The `billing-status` function provides the signed-in user with their own entitlement state. Set `OPEN_DOOR_SYNC_SECRET` server-side and use the same secret only in a protected CI secret. Configure only feeds whose terms permit collection. The existing Python collector writes feed candidates to CSV; the included workflow can upload them to the moderation queue. The current source registry contains no active approved feed URLs, so no feed sync will produce live results until sources are reviewed and enabled.

## 9. Test checklist

- Sign-in OTP works and wrong/expired codes fail.
- AI key absent returns a controlled 503, not a fake response.
- Chat requests are rate-limited and no prompts are stored.
- Feedback appears pending first and cannot be read publicly until approved.
- New user cannot start checkout while `billing_eligible=false`.
- Invalid Stripe webhook signatures fail.
- Feed candidates enter pending_review only.
- No server secrets appear in browser source or Git history.

## 10. Before launch

Publish privacy notice, terms, contact/reporting routes, deletion process, moderation policy, AI-use disclosure, accessibility statement, refund/cancellation terms (if Premium is activated), and adult/guardian procedures appropriate to the countries served. Get independent security and legal review before real student accounts or payments go live.

## Moderator starter queries

Inspect candidate queue:

```sql
select id, provider, title, official_url, category, discovered_at
from public.opportunity_candidates
where review_status = 'pending_review'
order by discovered_at desc;
```

Inspect pending public feedback:

```sql
select id, topic, rating, comment, created_at
from public.feedback where status = 'pending' order by created_at desc;
```

Only moderators using protected Supabase admin access should change review statuses. Do not create anonymous update policies. For an opportunity, check its official page, normalize all eligibility/funding/date fields, and only then insert/update `public.opportunities` with `status='verified'`, `last_checked` and a real moderator user ID in `verified_by`. For feedback, reject comments containing personal information, abuse or misleading claims before approving.


## 9. Telegram opportunity intake

The project includes `supabase/functions/telegram-intake`. It supports two permission-based intake modes:

1. **Maintainer forwarding (recommended first):** an allow-listed OpenDoor maintainer forwards a public channel post to your private OpenDoor bot. The bot sends the content to `opportunity_candidates` as `pending_review`.
2. **Channel-owner authorized updates:** the channel owner/admin adds the bot with the access required to receive channel posts. The source channel ID must be allow-listed. Do not add a bot to a third-party channel without the owner's permission.

The user-supplied `https://t.me/opportunity_alerts` channel is recorded as an inactive discovery source. This project has not inspected or verified its current posts or reuse terms. The channel is not automatically harvested by default.

### Configure

- Create a Telegram bot through Telegram's official BotFather account.
- Create a long random webhook secret using only letters, numbers, `_` or `-`.
- Ask each maintainer to open the bot and send `/id`; the bot returns the chat ID. Add only trusted maintainer chat IDs to the allow-list. For direct channel updates, add the channel chat ID only after owner authorization.
- Set server-only secrets:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
supabase secrets set TELEGRAM_WEBHOOK_SECRET=YOUR_RANDOM_WEBHOOK_SECRET
supabase secrets set TELEGRAM_ALLOWED_CHAT_IDS=ID1,ID2,ID3
```

- Deploy the function:

```bash
supabase functions deploy telegram-intake --no-verify-jwt
```

- Set the webhook from a trusted terminal, replacing placeholders. Do not paste the token into chat or commit it to a repository:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://YOUR_PROJECT_REF.supabase.co/functions/v1/telegram-intake","secret_token":"YOUR_RANDOM_WEBHOOK_SECRET","allowed_updates":["message","channel_post"]}'
```

- Open the bot and send `/start`. Forward one test announcement containing an official HTTPS link.
- Inspect the Supabase `opportunity_candidates` table. The item must be `pending_review`.

### Moderation rules

Telegram post text is a discovery lead, not proof that an opportunity is real, current or open worldwide. Before publication, a moderator must check the original organizer page and verify title, current cycle, deadline and timezone, eligible countries, age/grade, fees, funding coverage, required documents and application URL. Replace a Telegram post URL with the organizer's official page wherever available. Never auto-publish forwarded content.

If the channel owner does not permit bot access, use maintainer forwarding or another source method the owner permits. Do not scrape private channels or bypass Telegram access controls.


For the Telegram bot intake setup, permissions, webhook configuration and daily review process, see `TELEGRAM_OPPORTUNITY_WORKFLOW.md`.
