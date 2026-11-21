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

4. In the Supabase SQL Editor, run `supabase/seed_discovery_candidates.sql` once. It seeds discovery candidates as pending review; it does not make them public.

## B. Configure email one-time-code authentication

1. In Supabase Dashboard open Authentication → Sign In / Providers → Email.
2. Enable email sign-in/OTP and configure the email template to include the numeric token expected by OpenDoor (for example `{{ .Token }}`).
3. Configure a reliable email sender using the provider settings available to the project.
4. Add the site URL and allowed redirect URLs for the exact GitHub Pages URL displayed in repository Settings → Pages. Add the local test URL `http://localhost:8000` only while testing.
5. Test request code, verify code, invalid/expired code, sign-out and session refresh.
6. Before serving minors, publish privacy notice, age-appropriate consent flow where legally required, data retention and deletion process. Keep profile data minimal.

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

The functions perform their own identity, secret, rate-limit or webhook-signature checks. Test every endpoint after deployment. The code uses `FRONTEND_ORIGIN` for CORS, with `http://localhost:8000` as a local development fallback; set the exact deployed website origin before public use.

## F. Test accounts

- Email OTP sends and verifies correctly.
- User profile rows are created by the auth trigger.
- A user cannot edit their own `billing_eligible` field or entitlement.
- A user's profile and entitlement are private to that user.
- Anonymous visitors can read only verified, unexpired opportunities and approved feedback.
- No user can read candidate queues, source registry admin data or rate-limit records.
- Do not enable general public sign-up until privacy, consent, support and deletion processes are ready.

## G. Live AI test

With the AI secret configured, ask questions unrelated to the catalogue and questions about a verified record. Confirm the assistant says when facts are missing and links to the official provider. Test rate limiting and provider errors. If no key is configured, a controlled unavailable response is expected; the browser's local guide is a separate fallback.

## H. Public reviews

Submissions should remain `pending`. A trusted adult moderator with protected admin access reviews and approves or rejects. Public queries should return only approved records. Publish a moderation/reporting policy and remove comments containing personal data, harassment, scams or unsupported claims.

## I. Premium / payments

Keep payments disabled during the student prototype. An appropriate adult/organization must own the merchant account and review provider availability, terms, taxes, refunds, cancellation, privacy and consumer requirements in every country served. Do not use a minor's personal merchant account, and do not enable `billing_eligible` for a minor. Only activate hosted checkout after this review and full sandbox testing.
