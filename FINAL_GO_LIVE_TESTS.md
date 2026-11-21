# OpenDoor Global 5.4.0 — local release checks

Date: 2026-11-21

## Passed

- `node --check` for `app.js`, `backend.js`, `pitch-tour.js` and `data.js`.
- Python compilation for the public-site builder and all dataset Python tools.
- Bash syntax check for `scripts/deploy_supabase.sh`.
- TOML parse for `supabase/config.toml`; Telegram webhook function has JWT verification disabled at Supabase gateway level and validates its own webhook secret in the handler.
- GitHub Pages workflow YAML parsed and contains the Pages write / OIDC deployment steps.
- `scripts/build_public_site.py` completed successfully.
- Public build checks every local HTML asset reference and rejects server-only secret names in the browser config.
- Local HTTP server returned 200 for homepage and `app.js`.
- Opportunity catalogue validation: 52 rows read, 52 valid, 0 rejected, 0 warnings.
- Release ZIP archives passed `unzip -t` integrity tests.

## Not tested / not activated

- GitHub Pages deployment and final public URL (requires pushing to `Abeni-style/OpenDoor` and enabling Pages).
- Supabase database migration against a real project.
- Email OTP delivery and account deletion against a real email provider/project.
- Live AI calls against an authorized provider account and secret.
- Public review moderation with real user accounts.
- Stripe sandbox/webhook lifecycle or production payments.
- Scheduled feed collection against live approved source URLs (source registry has 0 active feeds).
- Telegram webhook against a real bot and authorized channel/maintainer.

A local passing test does not establish a live cloud service. Use `RELEASE_READINESS_MATRIX.md` for activation requirements and acceptance evidence.
