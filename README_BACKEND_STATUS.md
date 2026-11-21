# OpenDoor backend release status

This release adds the source code for live integrations, not deployed services. Supabase, OpenAI, Stripe and GitHub Actions must be configured by an authorized administrator. The `backend/README.md` has the full checklist.

**Never represent these integrations as live until they have been deployed and tested.** The website deliberately shows Preview mode when `backend-config.js` is missing. New accounts cannot purchase Premium by default (`billing_eligible=false`).
