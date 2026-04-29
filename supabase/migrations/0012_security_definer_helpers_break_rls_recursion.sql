-- Bug: RLS policies on public.users call is_admin_or_super(), is_super(),
-- and tg_id() — each function ran `SELECT … FROM public.users WHERE
-- auth_uid = auth.uid()`. Because the helpers were NOT SECURITY DEFINER,
-- those subqueries got re-checked by the same RLS, which called the
-- helpers again, which ran the subqueries again, … → Postgres aborted
-- with `stack depth limit exceeded` and the API returned 500 for
-- /rest/v1/users, /bookmarks, /attempts (read), /user_achievements, etc.
--
-- Fix: mark the three helpers as SECURITY DEFINER + lock their
-- search_path. They only read narrow projections (no destructive ops)
-- so escalating to definer privileges is safe — and necessary to break
-- the recursion.

CREATE OR REPLACE FUNCTION public.tg_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT telegram_id FROM public.users WHERE auth_uid = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_uid = auth.uid()
      AND role IN ('admin'::user_role, 'superadmin'::user_role)
      AND NOT blocked
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_uid = auth.uid()
      AND role = 'superadmin'::user_role
      AND NOT blocked
  )
$$;

GRANT EXECUTE ON FUNCTION public.tg_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super() TO anon, authenticated;
