#!/usr/bin/env bash
set -euo pipefail

cat <<'BANNER'
OpenDoor Supabase deployment helper
Run this from an account controlled by an appropriate adult/organization.
This script links the project, applies migrations and deploys source functions.
It does not create provider accounts or enter private API/payment/Telegram secrets.
BANNER

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed. Install it using Supabase's official CLI instructions, then rerun this script." >&2
  exit 1
fi

read -r -p "Supabase project reference: " PROJECT_REF
if [[ ! "$PROJECT_REF" =~ ^[a-z0-9]{20}$ ]]; then
  echo "The project reference format does not look right. Copy it from the Supabase project dashboard." >&2
  exit 1
fi

supabase login
supabase link --project-ref "$PROJECT_REF"
supabase db push

for fn in student-assistant submit-feedback create-checkout stripe-webhook ingest-candidates billing-status telegram-intake; do
  echo "Deploying $fn..."
  supabase functions deploy "$fn" --no-verify-jwt
done

echo
cat <<'NEXT'
Deployment source pushed. Now complete the Dashboard configuration in docs/SUPABASE_ACTIVATION.md:
- Email OTP provider/template and allowed URLs
- Public frontend URL and browser config
- Server-side secrets (only for features you are ready to activate)
- Authentication, RLS and moderator tests
- AI, Telegram and payment provider checks
NEXT
