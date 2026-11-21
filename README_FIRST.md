# OpenDoor Global 5.4.0 — start here

## Run a local demo

1. Extract the project.
2. Open the `opendoor` folder.
3. On Windows, double-click `START_OPENDOOR.bat`; on macOS/Linux, run `./START_OPENDOOR.sh`.
4. Open `http://localhost:8000`.

## Publish a public website

Read `docs/GITHUB_PAGES_DEPLOYMENT.md`. The repo-specific GitHub Actions workflow is included. It builds only the frontend into `public/` and deploys that folder to GitHub Pages.

## Activate backend services

Read `docs/SUPABASE_ACTIVATION.md`. A responsible adult/organization administrator must create/configure Supabase, run migrations, configure Email OTP and deploy functions. Do not put server secrets into frontend files, GitHub or Colab.

## Other activation guides

- `docs/OPPORTUNITY_FEED_ACTIVATION.md` — approved daily feeds and Telegram intake.
- `docs/PAYMENTS_AND_MINOR_SAFEGUARDS.md` — keep checkout disabled until adult/organization and legal/payment checks are complete.
- `RELEASE_READINESS_MATRIX.md` — exact status and test required for each unfinished service.
- `TELEGRAM_OPPORTUNITY_WORKFLOW.md` — Telegram bot permission, allow-list and moderation.

## Truthful feature status

This is a developed website prototype with source code for backend integrations. No project should be described as having live AI, cloud accounts, shared reviews, paid subscriptions or automated worldwide opportunity synchronization until those services are deployed and tested end to end. Opportunity records with unknown facts remain unknown; discovery sources are not endorsements or proof of open applications.
