# OpenDoor 5.3.0 validation report

## Passed
- Telegram intake function TypeScript syntax transpilation.
- Forwarded Telegram post parser with an HTTPS link.
- Rejection of submissions without a link.
- The parsed record is marked `pending_review`, never published.
- Opportunity CSV validation: 52 rows read, 52 valid, 0 rejected, 0 structural warnings.
- Existing `app.js` and `backend.js` syntax checks.
- Python dataset scripts compile.
- Release archive integrity.

## Not live / not tested end to end
- No Telegram bot has been created, no webhook is registered, and channel-owner permission has not been received.
- Supabase has not been deployed or connected.
- Live generative AI is not active because no server-side API key is configured.
- Email OTP authentication is not active.
- Public feedback moderation is not active.
- Premium payments are not active.
- The scheduled feed workflow has no active approved RSS/Atom/JSON feed URLs in the source registry.
- Full interactive browser and cloud deployment tests were not performed in this environment.

**Catalogue warning:** The 52 rows are discovery records, not verified current-cycle openings. Verify every opportunity using the official provider source before publication.
