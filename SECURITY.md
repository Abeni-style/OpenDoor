# Security policy

- Never commit OpenAI, Stripe, Supabase service-role, webhook or sync secrets.
- `backend-config.js` contains only a Supabase project URL and public anon key.
- Use server-side secret storage for all privileged credentials.
- Rotate any credential that was shared in public chat, source code or logs.
- Keep service-role access in Edge Functions only.
- Treat every imported opportunity as untrusted until source-reviewed.
- Keep reviews pending until moderated; provide a process for reporting/removing content.
- Do not collect exact DOB, passport information, home address, financial details or unnecessary sensitive data.
- Chat is sent to the configured AI provider; review that provider's data retention and minor-safety requirements.
- Premium checkout is disabled by default and must remain blocked without adult/guardian authorization and legal review.
