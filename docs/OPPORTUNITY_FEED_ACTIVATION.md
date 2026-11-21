# Daily opportunity feed activation

The GitHub Actions workflow `.github/workflows/opportunity-feed.yml` is scheduled daily, but it will not collect anything until an administrator enables at least one permitted feed in `datasets/source_registry.csv`.

## Approved-source requirements

For each source, record:

- official provider name and HTTPS homepage;
- exact RSS, Atom or documented JSON/API endpoint;
- source owner/contact and categories;
- terms/API-use review status;
- country and category scope;
- refresh frequency;
- last successful sync and error notes.

Set `active=yes` and `terms_reviewed=yes` only after someone has read the provider's collection/reuse terms and confirmed that automated retrieval is permitted. Do not guess feed URLs. A normal homepage URL is not a feed URL.

## Configure GitHub Actions

In repository Settings → Secrets and variables → Actions, add:

- `SUPABASE_URL` = project URL (only if candidate ingestion to Supabase is enabled);
- `OPEN_DOOR_SYNC_SECRET` = the same long random secret stored in Supabase Edge Function Secrets.

The collector writes candidates to a workflow artifact and optionally sends them to `ingest-candidates`. All records remain `pending_review` until a human verifies the official program page. Never auto-publish scraped data.

## Telegram source

Use `supabase/functions/telegram-intake` only after creating a bot, adding trusted maintainers to its allow-list, configuring webhook secrets, and obtaining channel-owner permission for direct channel updates. Without channel-owner permission, use maintainer-forwarded announcements. The Telegram channel is a discovery source only, not proof that an opportunity is open or trustworthy.

## Manual fallback

If no feed/API is available, use provider homepage monitoring and maintainer submissions. Record the date checked and the official URL. Do not describe the catalogue as exhaustive or continuously updated until feeds are actually operating and monitored.
