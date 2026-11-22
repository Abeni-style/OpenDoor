# Supabase activation runbook

Use an adult/organization-controlled Supabase account for a student-facing service. Do not send credentials, OTPs or API keys to collaborators through chat. Keep server keys in Supabase Edge Function Secrets only.

## A. Create the project and database

1. Create a Supabase project and keep its Project URL, anon/publishable key and project reference private to the project administrators. The anon key is intended for the browser; the service-role key is not.
2. Install the Supabase CLI.
3. From the OpenDoor project root run:

   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

4. In the Supabase SQL Editor, run `supabase/migrations/0002_student_workspaces.sql` once to add the RLS-protected opt-in student workspace backup table. Then run `supabase/seed_discovery_candidates.sql` once. It seeds discovery candidates as pending review; it does not make them public.

## B. Configure email one-time-code authentication

1. In Supabase Dashboard open Authentication → Sign In / Providers → Email.
2. Enable email sign-in. OpenDoor currently uses Supabase's default Magic Link flow, so keep the default Magic Link template and ensure it contains `{{ .ConfirmationURL }}`. Custom SMTP is optional for the initial test and required for reliable production sending.
3. For controlled tests, Supabase's default email service may be used subject to its limits. Before public registration, configure a transactional email sender (for example Resend) using a domain controlled by the organization, verify DNS, then configure SMTP in Supabase.
4. Add the site URL and allowed redirect URLs for the exact GitHub Pages URL displayed in repository Settings → Pages. Add the local test URL `http://localhost:8000` only while testing.
5. Test request email link, click link in the same browser, successful return, invalid/expired link, sign-out and session refresh.
6. Before serving minors, publish privacy notice, age-appropriate consent flow where legally required, data retention and deletion process. Keep profile data minimal. Cloud workspace backup is opt-in and must only be enabled with required parent/guardian permission.

## C. Configure the public frontend connection

Edit **both** `backend-config.js` in the project root and rerun `python scripts/build_public_site.py`. This rebuilds `public/backend-config.js` for deployment.

```js
window.OPENDOOR_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLIC_ANON_KEY",
  FRONTEND_ORIGIN: window.location.origin
};
```

Only the project URL and public anon/publishable key belong here. Never use the service-role key in the browser.

## D. Configure server secrets

From an administrator terminal, set these only when the corresponding service is ready:

```bash
supabase secrets set FRONTEND_ORIGIN=https://abeni-style.github.io
supabase secrets set RATE_LIMIT_PEPPER="REPLACE_WITH_LONG_RANDOM_VALUE"
```

Supabase normally injects its project URL and service-role key into Edge Function environments. Do not copy the service-role key into frontend code, GitHub Actions variables or a notebook. Check the current Supabase project dashboard/runtime environment before overriding built-in values.

For live AI, an authorized adult/organization-controlled provider account must review provider terms, privacy, retention, age requirements and billing first. Then set:

```bash
supabase secrets set OPENAI_API_KEY="SERVER_SIDE_KEY"
supabase secrets set OPENAI_MODEL="MODEL_AVAILABLE_IN_YOUR_API_ACCOUNT"
```

The key must not appear in `backend-config.js`, HTML, JavaScript, CSV, Git history or the public repository.

## E. Deploy Edge Functions

Run from the project root after linking the project:

```bash
supabase functions deploy student-assistant --no-verify-jwt
supabase functions deploy submit-feedback --no-verify-jwt
supabase functions deploy create-checkout --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy ingest-candidates --no-verify-jwt
supabase functions deploy billing-status --no-verify-jwt
supabase functions deploy telegram-intake --no-verify-jwt
```

The functions perform their own identity, secret, rate-limit or webhook-signature checks. Test every endpoint after deployment. The shared Edge Function CORS configuration now defaults to the production origin `https://abeni-style.github.io`. If the hosting origin changes, set `FRONTEND_ORIGIN` to the exact approved origin. Do not set it to the full `/OpenDoor/` path.

## F. GitHub-based Edge Function deployment (no local Python required)

1. Create a Supabase personal access token from the project administrator account.
2. In GitHub open Settings → Secrets and variables → Actions → New repository secret.
3. Name the secret `SUPABASE_ACCESS_TOKEN` and store the token value there. Never commit it to the repository or paste it into chat.
4. Open Actions → Deploy OpenDoor Supabase Edge Functions → Run workflow.
5. Confirm all seven functions deploy successfully. The workflow is manual and will fail clearly if the token is missing.

The current deployment workflow installs the Supabase CLI and deploys the Edge Functions to the project reference in the workflow. This does not automatically configure provider secrets.

## G. Test accounts

- Supabase Magic Link email sends and returns to the correct GitHub Pages URL.
- User profile rows are created by the auth trigger.
- A user cannot edit their own `billing_eligible` field or entitlement.
- A user's profile, entitlement and `student_workspaces` row are private to that user.
- Anonymous visitors can read only verified, unexpired opportunities and approved feedback.
- No user can read candidate queues, source registry admin data or rate-limit records.
- Do not enable general public sign-up until privacy, consent, support and deletion processes are ready.

## H. Live AI test

With the AI secret configured, ask questions unrelated to the catalogue and questions about a verified record. Confirm the assistant says when facts are missing and links to the official provider. Test rate limiting and provider errors. If no key is configured, a controlled unavailable response is expected; the browser's local guide is a separate fallback.

## I. Public reviews

Submissions should remain `pending`. A trusted adult moderator with protected admin access reviews and approves or rejects. Public queries should return only approved records. Publish a moderation/reporting policy and remove comments containing personal data, harassment, scams or unsupported claims.

## J. Premium / payments

Keep payments disabled during the student prototype. An appropriate adult/organization must own the merchant account and review provider availability, terms, taxes, refunds, cancellation, privacy and consumer requirements in every country served. Do not use a minor's personal merchant account, and do not enable `billing_eligible` for a minor. Only activate hosted checkout after this review and full sandbox testing.
