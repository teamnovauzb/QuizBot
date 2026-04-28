-- Show all users on the leaderboard (LEFT JOIN), even with 0 attempts.
-- Newcomers appear at the bottom with 0/0%/0pt. As they take quizzes,
-- their score_index increases and they climb the board.

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
LEFT JOIN public.attempts a ON a.user_id = u.telegram_id
WHERE NOT u.blocked
  AND u.role IN ('user'::user_role, 'admin'::user_role, 'superadmin'::user_role)
GROUP BY u.telegram_id;

GRANT SELECT ON public.leaderboard TO anon, authenticated;
