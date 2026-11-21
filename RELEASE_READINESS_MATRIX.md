# OpenDoor Global 5.4.0 — Release readiness and six service activations

This release adds a safe GitHub Pages build workflow and the missing Telegram function config. It does not claim that external services are live. The six services below each have an owner action and a test that must pass before changing their status to live.

| Service | Source status | What the owner must do | Proof of completion |
|---|---|---|---|
| Public website URL | GitHub Pages workflow included | Push project to `Abeni-style/OpenDoor`; set Pages source to GitHub Actions | Public HTTPS URL loads and is tested on laptop and phone |
| Student accounts | Supabase auth integration included | Adult/organization admin creates project, runs migration, configures Email OTP and email delivery, sets allowed URLs and frontend public config | Test code request, code verification, expiry, sign-out, RLS and deletion request |
| Live AI | Edge Function source included | Approved adult/organization connects provider account, sets server-side API key and valid model, deploys function | Real browser chat returns a provider response; missing key and rate limits fail safely |
| Public reviews | Edge Function and RLS policy included | Deploy Supabase, appoint adult moderators, review submissions and publish policy | New review is pending; anonymous public query only sees approved items |
| Premium payments | Hosted checkout + webhook source included, default billing eligibility false | Adult/organization owns merchant account, verifies country support, legal terms, refunds, tax, guardian and age rules, enables only authorized accounts | Sandbox test lifecycle and webhook signature verification; no minor checkout |
| Daily opportunities | RSS/Atom/JSON collector, scheduled workflow and Telegram intake source included | Add permitted feeds after terms review; configure GitHub Actions secrets; set Telegram bot/webhook/allow-list; verify each candidate | Workflow sync report shows feed results, candidates enter pending review, moderator publishes only checked records |

## Public website deployment

The connected GitHub account has admin access to the public repository `Abeni-style/OpenDoor`; at the last inspection it was empty (repository size 0). The project now includes `.github/workflows/deploy-pages.yml` and `scripts/build_public_site.py`.

Read `docs/GITHUB_PAGES_DEPLOYMENT.md`. In short: clone that repository, copy the contents of the extracted `opendoor` project into its root (including hidden `.github`), run `python scripts/build_public_site.py`, commit and push to `main`, then set Settings → Pages → Source to GitHub Actions. GitHub displays the final public URL.

## Supabase deployment

Read `docs/SUPABASE_ACTIVATION.md`. The project includes a Windows PowerShell helper `scripts/deploy_supabase.ps1` and a Bash helper `scripts/deploy_supabase.sh` to link a project, apply the migration and deploy seven functions. These scripts do not create provider accounts or enter secrets. The Supabase CLI, project reference, account login and server-side secrets remain administrator responsibilities.

A Supabase integration is available to connect in ChatGPT. Connecting it would allow more direct project/schema/function setup, but it is not connected yet. Until connected and authorized, no Supabase project has been created or modified by this work.

## Live AI

The browser key is never used for the AI provider. Only the Edge Function should receive `OPENAI_API_KEY`. The frontend continues to use a local guide when the backend is unconfigured. The AI model name must be a model available to the administrator's API account; do not assume a particular model is enabled.

## Student accounts and minors

Use an adult/organization-controlled Supabase project. Collect the minimum profile information, configure email delivery and allowed URLs, and publish a privacy notice, data deletion process, moderation/reporting contact and age-appropriate consent/guardian process where legally required before public sign-up.

## Public reviews

The browser can read only `status=approved`. The submission function inserts `pending` records. Use Supabase protected dashboard access/SQL editor for moderation; never add anonymous update/delete policies. Appoint trusted adult moderators and document a removal process.

## Premium

Payment activation is not appropriate as a student-led personal merchant setup. Keep checkout unavailable until a responsible adult/organization owns the merchant account and completes provider availability, legal, tax, refund, cancellation, privacy and age reviews. Never collect card details in OpenDoor.

## Opportunity automation

The current registry has 62 sources but zero active approved feeds. The scheduled workflow therefore has no feed URLs to poll. It is ready to run, not currently supplying new feed items. Read `docs/OPPORTUNITY_FEED_ACTIVATION.md`. Telegram intake supports maintainers forwarding announcements or direct channel updates only with channel-owner permission. Every item remains pending until a moderator verifies the official organizer page.

## Tests performed locally for this release

- Public-site builder copies only the frontend files to `public/` and checks local asset references.
- `backend-config.js` is checked for server-only secret names before publication.
- GitHub Pages workflow structure and Supabase config are included.
- JavaScript syntax, Python syntax, catalogue validation, HTML references and ZIP integrity must be checked at build time; this project still needs an actual hosted end-to-end test after the owner deployment.
