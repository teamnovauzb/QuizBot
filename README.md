# Shifokorat — Telegram Mini App

A 3-panel knowledge-quiz Mini App for Telegram (User · Admin · Super Admin), seeded with **102 informatics Q&A** parsed from `savol_javoblar.docx`. Uses Supabase as backend (Postgres + Edge Function for Telegram auth) with graceful fallback to localStorage when env vars aren't set.

> **⚠️ Bot token:** the token leaked during scaffolding (`8601…IhlQ`) **must be revoked** via @BotFather → `/revoke`, then stored as a Supabase Edge Function secret named `TELEGRAM_BOT_TOKEN`. It never goes into the client bundle.

## Stack

- **Vite 8 + React 19 + TypeScript**
- **Tailwind CSS v4** (zero-config, `@tailwindcss/vite`)
- **Framer Motion** for spring transitions, page reveals, ring animations
- **Zustand** + `persist` middleware → localStorage + (when configured) Supabase mirror
- **i18next** with `uz / ru / en` (auto-detected from Telegram `language_code`)
- **`@twa-dev/sdk`** + native `window.Telegram.WebApp` for haptics, theme, expand
- **Supabase** for Postgres, RLS, Edge Functions
- **Instrument Serif** (display) + **Geist** (body) + **Geist Mono** (labels)

## Design direction

Editorial / scholastic — deep ink (`#0E1116`) base with cream paper light mode (`#F7F5EE`) and electric coral (`#FF5C3D`) accent. Oversized question numerals, paper grain overlay, hairline rules, Roman-numeral section markers, lining numerals for stat plates. Mobile-first.

## Panels

### User (`/u`)
- **Home:** stats (score, streak, accuracy, completed) + quick-start tile + category / count / time-per-Q selectors → starts a quiz
- **Quiz:** timer ring, animated reveal, correct answer highlighted after submit, exit confirm sheet
- **Result:** ring-grade hero, A–F grade, Uzbek verdict, full review of every question with the right answer
- **History:** grouped by date with score + duration
- **Profile:** identity, lang switcher, role-switch shortcuts if elevated

### Admin (`/admin`)
- **Overview:** active users / questions / avg / completed + 7-day trend bars + recent attempts table
- **Questions:** searchable, filterable list with bottom-sheet editor (text, category pills, A–D options, correct-answer toggle)
- **Users:** members of admin's group only, with block/unblock

### Super Admin (`/super`)
- **Overview:** activity heatmap (7d × 24h), audit log, role distribution bars
- **Admins:** promote users to admin or add by Telegram ID + name; demote
- **Users:** all users, filter by role, block/promote/demote
- **Content:** full question bank CRUD
- **Broadcast:** title + body + recipient mode (all / admins / users), preview card, send confirmation toast

---

## Quickstart (local)

```bash
cd app
npm install
cp .env.example .env       # then fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev                # → http://localhost:5173
```

The app boots in **offline mode** if the env vars are missing — full demo on localStorage. With env set, it tries to authenticate with Supabase via the `tg-auth` edge function.

## Supabase setup

The `supabase/` folder contains everything:

```
supabase/
├── config.toml
├── migrations/
│   ├── 0001_schema.sql      tables, indexes, RLS policies, helper functions
│   └── 0002_seed.sql        102 questions + 9 demo users + 2 groups
└── functions/
    ├── _shared/cors.ts
    └── tg-auth/index.ts     verifies Telegram initData HMAC, mints Supabase JWT
```

### 1. Apply the schema + seed

Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) for your project and paste, in order:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_seed.sql`

(Or with the CLI: `supabase db push` once linked.)

### 2. Deploy the `tg-auth` edge function

```bash
# install once
npm i -g supabase

# from repo root
supabase login
supabase link --project-ref fmmvfbuooafapymviymo
supabase functions deploy tg-auth --no-verify-jwt
```

### 3. Set edge function secrets

```bash
supabase secrets set \
  TELEGRAM_BOT_TOKEN="<rotated-bot-token-from-BotFather>" \
  ALLOW_DEV_LOGIN="true"
```

`ALLOW_DEV_LOGIN=true` is required for the demo-role picker to work outside Telegram. **Set it to `false` (or unset) before going to production.**

### 4. (Optional) Lock down anon key access

The `sb_publishable_…` anon key is safe in the client because every table is gated by RLS. Verify policies in the SQL editor:

```sql
select tablename, policyname from pg_policies where schemaname = 'public';
```

## Auth flow

```
┌─ Frontend ─────────────────────────────────────────────────┐
│  Inside Telegram WebApp:                                  │
│    1. Read window.Telegram.WebApp.initData                │
│    2. POST { initData } → /functions/v1/tg-auth          │
│                                                          │
│  Outside Telegram (dev mode, ALLOW_DEV_LOGIN=true):       │
│    1. Pick a demo role on Entry screen                    │
│    2. POST { telegram_id, first_name } → tg-auth          │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─ Edge Function (tg-auth) ─────────────────────────────────┐
│  • Verifies initData HMAC against TELEGRAM_BOT_TOKEN      │
│    (rejects if hash invalid or auth_date > 24h old)      │
│  • Upserts row in public.users with auth_uid linkage      │
│  • Signs a Supabase JWT with deterministic email/password│
│  • Returns { access_token, refresh_token, user }          │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─ Frontend ─────────────────────────────────────────────────┐
│  • supabase.auth.setSession(...)                          │
│  • Listener triggers `hydrateFromSupabase()`              │
│  • All subsequent queries are RLS-gated by auth_uid       │
└────────────────────────────────────────────────────────────┘
```

## RLS overview (see `0001_schema.sql`)

| Table        | User can…           | Admin can…              | Super can…                    |
| ------------ | ------------------- | ----------------------- | ----------------------------- |
| `users`      | read self           | read all, block/unblock | full CRUD                     |
| `groups`     | read                | read                    | full CRUD                     |
| `questions`  | read active         | full CRUD               | full CRUD                     |
| `attempts`   | full CRUD on self   | read all                | read all                      |
| `audit`      | insert (own)        | —                       | read                          |
| `broadcasts` | —                   | —                       | full CRUD                     |

Helper SQL functions: `tg_id()`, `is_role(r)`, `is_admin_or_super()`, `is_super()`.

## Deploy frontend (Vercel)

`vercel.json` at repo root builds from `app/` and rewrites SPA paths.

```bash
vercel       # or import repo via dashboard
```

Add the same env vars in Vercel → Project → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://fmmvfbuooafapymviymo.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…
```

After deploy, set the Mini App URL via @BotFather:

```
/mybots → @shifokoratbot → Bot Settings → Menu Button
URL: https://<your-vercel-domain>/
```

## Project layout

```
.
├── app/                          frontend
│   ├── src/
│   │   ├── data/                 seed.json + questions.ts (Q&A → MCQ)
│   │   ├── i18n/                 uz / ru / en
│   │   ├── lib/                  supabase.ts, auth.ts, api.ts, telegram.ts, time.ts
│   │   ├── store/                Zustand store + types (mirrors writes to Supabase)
│   │   ├── components/           Shell, TabBar, LangSwitcher, Icons
│   │   └── screens/
│   │       ├── Entry.tsx         role picker + connection status
│   │       ├── user/             Home, Quiz, Result, History, Profile
│   │       ├── admin/            Overview, Questions, Users
│   │       └── superadmin/       Overview, Admins, AllUsers, Content, Broadcast
│   ├── .env.example
│   └── index.html
├── supabase/                     backend
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_schema.sql
│   │   └── 0002_seed.sql
│   └── functions/
│       ├── _shared/cors.ts
│       └── tg-auth/index.ts
├── savol_javoblar.docx           source (102 Q&A)
└── vercel.json
```

## Troubleshooting

**Connection badge says `supabase · http_404…`**
The `tg-auth` function isn't deployed. Run `supabase functions deploy tg-auth --no-verify-jwt`.

**`supabase · invalid_init_data`**
Bot token mismatch or 24h-stale `initData`. Re-open the Mini App from a fresh Telegram launch and check `TELEGRAM_BOT_TOKEN` matches the bot serving the Mini App.

**`supabase · no_init_data` outside Telegram**
Set the edge function secret `ALLOW_DEV_LOGIN=true` and use the demo-role picker on the Entry screen.

**RLS blocks query**
Open the SQL editor and run `select public.tg_id()` while authed — should return your `telegram_id`. If null, the user row isn't linked to the auth user; re-trigger `tg-auth`.

**Reset all local state**
DevTools console: `localStorage.clear(); location.reload()`.
