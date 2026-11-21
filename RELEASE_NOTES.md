# OpenDoor Global 5.4.0

## Deployment and activation improvements

- Added a dedicated GitHub Pages workflow that publishes only the static frontend from `public/`.
- Added a public-site build script with local asset checks and secret-name guardrails.
- Added Supabase deployment helpers for Windows PowerShell and Bash.
- Added an end-to-end Supabase activation guide for email OTP, database migrations, Edge Functions, AI secrets and CORS.
- Added Telegram function configuration (`verify_jwt = false`); the handler retains its own Telegram webhook secret validation.
- Restricted default Edge Function CORS origin to local development; production administrators must set `FRONTEND_ORIGIN` to the exact deployed site origin.
- Added separate guides for feed activation, moderation, payments/minor safeguards and privacy requirements.
- Updated start instructions and release readiness matrix.

## Important

No cloud service was activated by building this package. GitHub Pages requires the owner to upload/push the code and enable Pages; Supabase, AI, auth, reviews, payment and feeds require administrator-controlled accounts, credentials and end-to-end tests. Premium checkout remains gated and should not be enabled for minors.
