# OpenDoor moderation runbook

## Opportunity candidates

Candidates imported from RSS/Atom/JSON, Telegram or CSV are not public. They are stored in `opportunity_candidates` with `review_status='pending_review'`.

A trusted catalogue moderator should check the provider's official HTTPS page and record:

- exact program title, organizer and current application cycle;
- deadline date, timezone and whether rolling/closed;
- minimum and maximum age, and the date at which age is calculated;
- eligible and excluded countries/residency rules;
- school grade/education level and subject restrictions;
- tuition, application fee, travel, accommodation, meals, insurance and stipend coverage separately;
- online/in-person format, location and duration;
- required documents, official application URL and source last-checked date.

If any field is not explicit, leave it `Unknown`/`Not stated`. Do not infer from old cycles or promotional reposts.

## Publishing verified opportunities

Use a protected Supabase admin session/SQL Editor. Never expose the service-role key to the browser. A candidate should be published only after a human completes the checks above. Insert/update the normalized fields in `public.opportunities`, set `status='verified'`, `last_checked=current_date`, `verified_by` to the real moderator's auth UUID, and retain the source URL. The database constraint rejects a verified row without a check date and moderator ID.

The public policy only exposes verified, non-expired opportunities. Candidate tables and the source registry remain private to ordinary visitors.

## Public feedback

1. Read pending comments in the Supabase Table Editor.
2. Reject spam, harassment, claims that cannot be substantiated, advertisements, personal information and identifying information about minors.
3. Approve only constructive feedback that is suitable for public display.
4. Keep the moderation decision and date; process valid removal requests promptly.
5. Do not create anonymous UPDATE or DELETE policies on `feedback`.

Example SQL for the moderator's review queue:

```sql
select id, topic, rating, comment, created_at
from public.feedback
where status = 'pending'
order by created_at asc;
```

Example approval after manual review (replace the UUID with the selected feedback row and use a protected admin SQL session):

```sql
update public.feedback
set status = 'approved', moderated_at = now()
where id = 'REPLACE_WITH_FEEDBACK_UUID'
  and status = 'pending';
```

Example rejection:

```sql
update public.feedback
set status = 'rejected', moderated_at = now()
where id = 'REPLACE_WITH_FEEDBACK_UUID'
  and status = 'pending';
```

The public frontend reads only approved comments. Moderation must be performed by trusted adults under a published policy.
