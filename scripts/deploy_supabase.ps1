$ErrorActionPreference = 'Stop'
Write-Host 'OpenDoor Supabase deployment helper' -ForegroundColor Cyan
Write-Host 'Run only from an appropriate adult/organization-controlled Supabase account.'
Write-Host 'This script does not enter API keys, payment secrets or Telegram tokens.'
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  throw 'Supabase CLI not found. Install it using Supabase official CLI instructions.'
}
$projectRef = Read-Host 'Supabase project reference'
if ($projectRef -notmatch '^[a-z0-9]{20}$') { throw 'Project reference format looks incorrect. Copy it from Supabase Dashboard.' }
supabase login
if ($LASTEXITCODE -ne 0) { throw 'Supabase login failed.' }
supabase link --project-ref $projectRef
if ($LASTEXITCODE -ne 0) { throw 'Could not link Supabase project.' }
supabase db push
if ($LASTEXITCODE -ne 0) { throw 'Database migration failed. Stop and inspect the Supabase CLI output.' }
$functions = @('student-assistant','submit-feedback','create-checkout','stripe-webhook','ingest-candidates','billing-status','telegram-intake')
foreach ($fn in $functions) {
  Write-Host "Deploying $fn..." -ForegroundColor Cyan
  supabase functions deploy $fn --no-verify-jwt
  if ($LASTEXITCODE -ne 0) { throw "Deployment failed for $fn." }
}
Write-Host 'Source deployment complete. Finish Dashboard setup using docs/SUPABASE_ACTIVATION.md.' -ForegroundColor Green
