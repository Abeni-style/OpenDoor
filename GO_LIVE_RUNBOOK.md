# OpenDoor Global 5.4.0 — go-live sequence

Do these in order. Do not activate the backend or payments until the required adult/organization owner and privacy safeguards are in place.

## 1. Public website URL — GitHub Pages

- The GitHub account connected for this project has admin permission on `Abeni-style/OpenDoor`. The repository was empty at the last check.
- Follow `docs/GITHUB_PAGES_DEPLOYMENT.md` to clone it, copy this project's contents into the repository root, build `public/`, and push to `main`.
- In GitHub Settings → Pages, select GitHub Actions.
- Wait for `.github/workflows/deploy-pages.yml` to pass. Use the exact HTTPS URL shown in Settings → Pages.
- Test all pages on desktop and mobile.

## 2. Supabase accounts and database

- An appropriate adult/organization administrator creates the Supabase project.
- Run `supabase login`, `supabase link --project-ref ...`, then `supabase db push` from the project root. Windows helper: `scripts/deploy_supabase.ps1`; macOS/Linux: `scripts/deploy_supabase.sh`.
- Run `supabase/seed_discovery_candidates.sql` once in Supabase SQL Editor.
- Enable Email OTP, configure a numeric token email template and reliable delivery, set allowed site URLs and test the complete sign-in lifecycle.
- Edit `backend-config.js` with only the public project URL and anon/publishable key, run `python scripts/build_public_site.py`, commit and push.
- Complete privacy, consent, retention and deletion requirements before public student accounts.

## 3. Live AI

- An adult/organization owner reviews the AI provider's terms, privacy, retention, age rules and billing.
- Add `OPENAI_API_KEY` and a model available to that account as Supabase Edge Function Secrets.
- Deploy `student-assistant` and test actual response, error, rate-limit and safety behavior.
- Do not put the AI key in frontend code, GitHub, a CSV, notebook or chat.

## 4. Public reviews

- Deploy `submit-feedback` and use the Supabase table/SQL tools for moderation.
- Keep new reviews pending; public users can read only approved records.
- Appoint trusted adult moderators, publish reporting/removal rules, and test pending/approved/rejected visibility.

## 5. Premium payments

- Keep checkout disabled for the student prototype.
- Only an adult/organization merchant owner may review processor availability, age rules, legal terms, tax, refunds, cancellation and privacy requirements.
- Test hosted checkout and webhook lifecycle in sandbox before any production use.
- Never enable billing for a minor. Keep core opportunity information free.

## 6. Daily opportunities and Telegram

- The source registry currently contains 62 discovery sources but zero active approved feed URLs. Review provider terms and add real RSS/Atom/JSON URLs before setting `active=yes` and `terms_reviewed=yes`.
- Add `SUPABASE_URL` and `OPEN_DOOR_SYNC_SECRET` to GitHub Actions secrets only when feed ingestion is ready.
- For Telegram, create a bot, configure its server-side token/webhook secret and allow-list. Start with trusted maintainer forwarding. Direct channel posts require the channel owner's permission.
- Review every candidate against the official organizer page. Candidates remain pending until a moderator verifies and publishes them.

## Acceptance evidence

A service is live only after a real end-to-end test: public HTTPS page loads; an OTP arrives and verifies; live AI returns a response from the provider; a pending review becomes public only after moderator approval; payment sandbox lifecycle updates entitlements; or the feed workflow reports collected records that enter the pending review queue. A source file or a green static syntax check is not enough.

Detailed instructions are in `docs/` and `backend/README.md`.
