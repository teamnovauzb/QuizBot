-- Enable Postgres logical replication for the tables the live leaderboard
-- subscribes to. Without this, supabase-js Realtime never delivers
-- postgres_changes events and the LIVE pill in /u/leaderboard never lights up.
ALTER PUBLICATION supabase_realtime ADD TABLE public.attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
