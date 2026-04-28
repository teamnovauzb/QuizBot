-- Purge mock seed users + groups left over from 0002_seed.sql, and rebuild the
-- leaderboard view so it (a) includes admins/superadmins and (b) only shows
-- users who have actually completed at least one attempt.

-- 1. Delete seed groups FIRST so the users they admin can be removed
DELETE FROM public.groups
WHERE id IN (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid
);

-- 2. Delete seed users (mock telegram IDs from the original demo seed)
DELETE FROM public.users
WHERE telegram_id IN (
  100001, 200001, 200002,
  300001, 300002, 300003, 300004, 300005, 300006
);

-- 3. Rebuild leaderboard view
--    - drop the role='user' filter so admins / superadmins can rank
--    - require attempts > 0 (INNER JOIN) so empty users don't pollute the board
--      (NOTE: this is reversed in 0010; superseded by LEFT JOIN there)
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard AS
SELECT
  u.telegram_id,
  u.name,
  u.username,
  u.photo_url,
  u.group_id,
  count(a.id)::integer                                                AS attempts,
  COALESCE(sum(a.score), 0)::integer                                  AS total_correct,
  COALESCE(round(avg(a.score::numeric * 100 / NULLIF(a.total, 0)::numeric), 1), 0) AS avg_pct,
  (COALESCE(sum(a.score), 0)::integer * 10 + count(a.id)::integer)    AS score_index
FROM public.users u
JOIN public.attempts a ON a.user_id = u.telegram_id
WHERE NOT u.blocked
GROUP BY u.telegram_id;

GRANT SELECT ON public.leaderboard TO anon, authenticated;
