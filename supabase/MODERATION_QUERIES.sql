-- OpenDoor moderation starter queries. Run only as an authorized administrator.

-- 1. Review incoming opportunity candidates.
select id, provider, title, official_url, category, discovered_at, review_status
from public.opportunity_candidates
where review_status = 'pending_review'
order by discovered_at desc;

-- 2. Review community feedback. Never publish personal or sensitive information.
select id, topic, rating, comment, created_at
from public.feedback
where status = 'pending'
order by created_at desc;

-- 3. Approve feedback after human review. Replace the UUID with a real moderator auth.users id.
-- update public.feedback
-- set status='approved', moderated_at=now(), moderator_id='MODERATOR-UUID'
-- where id='FEEDBACK-UUID' and status='pending';

-- 4. Reject feedback after human review.
-- update public.feedback
-- set status='rejected', moderated_at=now(), moderator_id='MODERATOR-UUID'
-- where id='FEEDBACK-UUID' and status='pending';

-- 5. Mark an opportunity candidate reviewed. Do not set verified based only on a feed title.
-- Check age, grade, country, fee/funding, open/closed status, deadline/time zone, documents and official application URL at the organizer page.
-- Then normalize its values into public.opportunities and set status='verified', last_checked=current_date, verified_by='MODERATOR-UUID'.
