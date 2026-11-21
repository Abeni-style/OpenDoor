# Finish OpenDoor: the practical order

1. Publish the static website (GitHub Pages or another HTTPS static host). This makes the front end public but does not activate backend features.
2. Have an appropriate adult/organization own the Supabase project and provider accounts. Follow `GO_LIVE_RUNBOOK.md`.
3. Deploy the SQL migration and Edge Functions. Configure only public Supabase URL/anon key in browser code; keep service-role, AI, payment and Telegram secrets server-side.
4. Activate and test the AI assistant with an authorized AI account. Keep the offline assistant clearly labeled until the API works.
5. Activate email OTP and test account deletion, session expiry, and minor privacy safeguards.
6. Keep public reviews in pending moderation until an adult moderator is assigned.
7. Leave Premium checkout disabled until adult/organization merchant ownership, legal review, payment availability, refunds/tax/consumer rules and child-safety procedures are complete.
8. For daily opportunities, approve and configure legal RSS/Atom/JSON feeds in `datasets/source_registry.csv`; the GitHub Action already runs daily.
9. For Telegram, follow `TELEGRAM_OPPORTUNITY_WORKFLOW.md`. Start with trusted maintainers forwarding posts to the bot. Automatic channel updates require the channel owner's permission and the bot being authorized to receive posts.
10. Verify all opportunity facts against the official organizer page. Telegram posts and aggregator pages are discovery leads only.

Do not call OpenDoor a fully live production platform until the relevant end-to-end tests pass.
