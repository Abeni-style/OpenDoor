# Optional shared services

This project remains a static prototype unless you configure a real backend. `supabase_schema.sql` is a starting schema for public, moderated feedback and source-reviewed opportunity records.

- Never put a Supabase service-role key in frontend code.
- Public feedback must enter as `pending` and must not appear publicly until a moderator approves it.
- Do not collect sensitive student data. For minors, use age-appropriate privacy, parental/guardian consent where required, retention controls and clear reporting/removal channels.
- Do not enable sign-in or cloud profiles until authentication, access control, consent and data deletion workflows are designed.
- Payment checkout is intentionally not included. A real paid service requires an adult-owned legal/business/payment account, clear pricing, tax/refund/cancellation terms and applicable consumer/privacy compliance. Keep all core opportunity data available without requiring payment.
