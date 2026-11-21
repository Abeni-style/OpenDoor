# OpenDoor Telegram Opportunity Workflow

## What it does

OpenDoor can accept opportunity announcements from Telegram through a private bot. An approved maintainer forwards a post from a channel such as `@opportunity_alerts` to the OpenDoor bot. The bot sends the post to Supabase as a **pending review candidate**. It is not published immediately.

The same endpoint can receive direct channel-post updates only after that channel's owner/admin has authorized the bot and the channel chat ID is explicitly allow-listed.

## Important limitation

OpenDoor has not read or verified the current posts or reuse terms of `https://t.me/opportunity_alerts`. The channel is recorded in the source registry as inactive. A public Telegram link does not itself grant permission for a bot to join a channel or for OpenDoor to republish its contents. Start with maintainer-forwarded posts. Ask the channel owner before enabling direct bot access or bulk reuse.

## Setup

### 1. Create a bot

- In Telegram, open the official `@BotFather` account.
- Create a bot and copy its bot token.
- Keep the token private. Never paste it into this chat, a GitHub commit, a website JavaScript file, or a public notebook.

### 2. Create a webhook secret and configure the bot token

Create a long random webhook secret using only letters, numbers, `_` or `-`. In a trusted terminal, set the first two server secrets. Leave the allow-list empty temporarily so maintainers can retrieve their own IDs with `/id`:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
supabase secrets set TELEGRAM_WEBHOOK_SECRET=YOUR_RANDOM_WEBHOOK_SECRET
```

The function also uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` supplied by the Supabase Edge Functions runtime. Never place the service-role key or Telegram bot token in frontend configuration.

### 3. Deploy the function

```bash
supabase functions deploy telegram-intake --no-verify-jwt
```

The function authenticates Telegram using the `X-Telegram-Bot-Api-Secret-Token` header. The token is checked server-side.

### 4. Register the webhook

Use a trusted terminal and replace every placeholder. The bot token appears in the Telegram API URL, so do not share terminal logs or shell history containing the substituted command.

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://YOUR_PROJECT_REF.supabase.co/functions/v1/telegram-intake","secret_token":"YOUR_RANDOM_WEBHOOK_SECRET","allowed_updates":["message","channel_post"]}'
```

Telegram should return `ok: true`. You can check the current webhook using Telegram's `getWebhookInfo` method from a trusted terminal.

### 5. Get and allow-list maintainer chat IDs

- Each trusted maintainer opens the new bot in Telegram and presses Start.
- Each sends `/id`.
- The bot replies with that private chat ID. `/id` works before allow-listing and does not submit any opportunity.
- Add only the five trusted team/maintainer IDs to the allow-list:

```bash
supabase secrets set TELEGRAM_ALLOWED_CHAT_IDS=ID1,ID2,ID3,ID4,ID5
```

- Wait for the function's updated secrets to take effect, then test a forwarded post.

### 6. Test with one forwarded post

- Ask one maintainer to forward a sample opportunity post to the OpenDoor bot.
- Include the original announcement text and at least one HTTPS link.
- The bot replies that the item was received for review.
- In Supabase, inspect `public.opportunity_candidates`.
- Confirm that the row has `review_status = 'pending_review'`.

The function accepts forwarded messages and captions. It extracts the title, likely category, visible HTTPS links, original channel metadata when available, and raw text. It cannot reliably infer every eligibility or funding rule from a Telegram message.

## How to automate direct channel updates

For unattended collection from `@opportunity_alerts`, contact the channel owner/admin and request permission to add the OpenDoor bot with the access required to receive channel posts. If the owner agrees:

1. Add the bot according to Telegram's channel permissions.
2. Obtain the channel chat ID through a controlled test update or the bot's update logs.
3. Add the channel chat ID to `TELEGRAM_ALLOWED_CHAT_IDS`.
4. Confirm the bot receives `channel_post` updates.
5. Monitor delivery and failed webhook events.

If the channel owner does not permit bot access, use maintainer forwarding or another source method the owner expressly permits. Do not scrape private channels or bypass access controls.

## Review and publication policy

Every Telegram item enters `opportunity_candidates` as `pending_review`. It is never automatically published.

A moderator must visit the original organizer's website and verify:

- Program name and provider
- Current application cycle and whether applications are open
- Minimum/maximum age and grade/education level
- Eligible and excluded countries
- Subject or track restrictions
- Online, in-person or hybrid delivery and host country
- Tuition, application fee, travel, accommodation and stipend coverage separately
- Application opening date and deadline, including timezone
- Required documents and application URL
- Whether the announcement is authentic and still current

The public Telegram post link is a discovery reference, not proof of official eligibility. Prefer the organizer's official page as the public listing source. If a detail cannot be confirmed, store it as `Not stated` or `Unknown`; never guess.

## Daily opportunity flow

1. New announcement is forwarded to the bot or received through an authorized channel update.
2. The webhook adds a pending candidate.
3. The catalogue moderator checks the original provider page.
4. The moderator normalizes age, country, grade, funding and deadline fields.
5. The moderator publishes only the verified record to `public.opportunities`.
6. The website displays the record and last-checked date.
7. A scheduled review closes expired listings and rechecks upcoming deadlines.

The existing GitHub Actions workflow can also collect approved RSS/Atom/JSON feeds daily. The current source registry has no active approved feed URLs, so automatic feed collection will not produce results until permitted feeds are reviewed and configured.
