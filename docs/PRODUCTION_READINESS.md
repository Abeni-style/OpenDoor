# OpenDoor production-readiness status

Last checked: 2026-11-22.

## Verified completed work

- Public GitHub Pages site deployed successfully: https://abeni-style.github.io/OpenDoor/
- Latest frontend release: commit `f3192fef94226b45860539c7c26d1eadf77a053b`, GitHub Actions run [#45021720421](https://github.com/Abeni-style/OpenDoor/actions/runs/45021720421).
- Supabase project reference corrected to `hkhbiujfbysqtlqtuidx`.
- Seven Edge Functions deployed successfully to the OpenDoor production project in GitHub Actions run [#45021531106](https://github.com/Abeni-style/OpenDoor/actions/runs/45021531106):
  - `student-assistant`
  - `submit-feedback`
  - `create-checkout`
  - `stripe-webhook`
  - `ingest-candidates`
  - `billing-status`
  - `telegram-intake`
- Supabase project configuration and GitHub deployment workflow now use the correct 20-character project reference.
- The Edge Function deployment workflow includes non-interactive confirmation (`--yes`) and serialized deployments.
- Pages and opportunity-feed workflows use Node 24-compatible action releases.
- Browser frontend configuration uses only the Supabase publishable key; no service-role, AI, Telegram or Stripe secret belongs in public files.
- Student workspace migration `0002_student_workspaces.sql` is present in the repository. The Supabase SQL Editor showed `relrowsecurity = true` for `public.student_workspaces`, confirming that the table exists and RLS is enabled.
- Student cloud backup is opt-in. It syncs a deliberately limited workspace snapshot, not chat messages, feedback, imported opportunity records, essays or CV drafts. The account UI includes enable, sync, disable and delete-backup controls.
- JavaScript syntax checks passed for `app.js` and `backend.js`.

## Still requires account-owner configuration or live testing

### Authentication and email
- Test a real Supabase magic-link send, click-through, session persistence and sign-out on the published domain.
- Supabase's default email sender is limited. Reliable public email delivery requires an organization-controlled domain, verified transactional sender and custom SMTP configuration.
- Google OAuth code is present, but the Google provider must be enabled in Supabase with a valid client ID and newly rotated client secret. The callback URI must be `https://hkhbiujfbysqtlqtuidx.supabase.co/auth/v1/callback`.
- Phone sign-in remains disabled until a supported SMS provider and valid credentials are configured and tested.

### Live AI
- `student-assistant` is deployed but returns a controlled unavailable response until `OPENAI_API_KEY` is configured as a Supabase Edge Function secret. Set `OPENAI_MODEL` to a model enabled for the administrator's API account.
- Do not put the AI key in GitHub source files or browser configuration.

### Cloud backup
- The migration and RLS are present, but a real signed-in user's enable/sync/restore/delete cycle still needs to be tested.
- Cloud backup is off by default. Users under 18 should only enable it after the required parent/guardian permission and privacy review.
- The migration is available at `supabase/migrations/0002_student_workspaces.sql`.

### Public feedback
- Feedback Edge Function is deployed. Submissions are stored as pending and public reads return approved records only.
- A designated adult moderator and review procedure must be established. Verify submission and approved-review display with a test account.

### Opportunities and Telegram
- The source registry contains discovery leads; it is not an exhaustive worldwide catalogue.
- Current registry inspection found 62 source rows, zero active sources, zero configured feed URLs and zero sources marked terms-reviewed. Therefore the scheduled feed collector has no approved feeds to poll yet.
- The existing feed collector only uses approved RSS/Atom/JSON feeds. It does not crawl the whole internet. Every candidate stays pending human review.
- The 52 candidate records found in the candidate table remain pending review; they are not public verified opportunities.
- Telegram intake is deployed but requires `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` and `TELEGRAM_ALLOWED_CHAT_IDS`. It accepts forwarded posts from allowlisted maintainers; it does not automatically scrape arbitrary Telegram channels.
- Candidate ingestion additionally requires `OPEN_DOOR_SYNC_SECRET`.

### Premium and payments
- Checkout and webhook functions are deployed but are not configured for live payments.
- Keep Premium checkout disabled until an adult/organization controls the merchant account, verifies provider availability, and completes applicable legal, privacy, tax, refund and consumer-protection review. Do not enable billing eligibility for minors.

## Recommended next tests

1. Test a real email magic link on the production website.
2. Test Google sign-in after the provider credentials and callback are configured.
3. With appropriate consent, enable cloud backup for one test account, save a test task, refresh the page, confirm the data returns, then test delete-backup.
4. Submit test feedback, approve it using the moderator process, and verify only approved comments are public.
5. Configure the AI secret and test real AI responses, rate limits and missing-key behaviour.
6. Activate only approved feed URLs and verify that all new candidates remain pending review.
7. Leave phone sign-in, Telegram intake and Premium disabled until their respective credentials and safeguards are in place.

## Safety and privacy

OpenDoor is intended for students, including minors. Do not open unrestricted public registration until an adult/organization has reviewed privacy notice, consent, age-appropriate data collection, retention and deletion, moderation and support procedures. Never request passwords, passport numbers, exact birth dates, home addresses or financial credentials in the student workspace.
