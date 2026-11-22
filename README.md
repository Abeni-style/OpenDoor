# OpenDoor

OpenDoor is a student opportunity-discovery and development platform prototype. It brings together a source-linked opportunity catalogue, eligibility matching, structured learning materials, application preparation tools, a personal workspace, community feedback and an optional AI assistant.

## Public website

https://abeni-style.github.io/OpenDoor/

## Current implementation

- Static frontend hosted on GitHub Pages.
- Supabase email magic-link authentication and Google OAuth integration code.
- Seven deployed Supabase Edge Functions for AI assistance, moderated feedback, checkout, Stripe webhooks, opportunity ingestion, billing status and Telegram intake.
- Opt-in student workspace cloud backup protected by Supabase Row Level Security.
- CSV/JSON opportunity import, validation and matching.
- RSS/Atom/JSON candidate collector with human review required before publication.
- Student Development Academy, application tracker, study planner and preparation resources.

## Important limitations

A deployed function is not automatically a configured service. Live AI requires an administrator-managed OpenAI API key. Google OAuth requires valid provider credentials. Phone sign-in requires a configured SMS provider. Telegram intake requires a bot token, webhook secret and maintainer allowlist. Premium checkout remains disabled pending adult/organization ownership, legal review and payment-provider configuration.

The opportunity source registry is a discovery list, not a live global feed. Sources must be reviewed for terms and permitted feeds before activation. New imported or feed-discovered opportunities remain pending human review and must not be represented as verified until checked against the organizer's official information.

Before public use by minors, an adult/organization must review privacy, consent, data retention, account deletion, moderation, support and applicable legal requirements. Cloud backup is opt-in and should only be enabled with required parent/guardian permission.

See [the Supabase activation runbook](docs/SUPABASE_ACTIVATION.md) and [the current production-readiness status](docs/PRODUCTION_READINESS.md).
