# Shifokorat — Telegram Mini App

A 3-panel knowledge-quiz Mini App for Telegram (User · Admin · Super Admin), seeded with **102 informatics Q&A** from the source `savol_javoblar.docx`.

> **⚠️ Bot token rotation:** the token shared during scaffolding (`8601…IhlQ`) should be revoked via @BotFather → `/revoke`, then stored as a Vercel env var (`VITE_BOT_TOKEN`) — it is not committed.

## Stack

- **Vite 8 + React 19 + TypeScript**
- **Tailwind CSS v4** (zero-config, `@tailwindcss/vite`)
- **Framer Motion** for spring transitions, page reveals, ring animations
- **Zustand** + `persist` middleware → state in `localStorage` until backend lands
- **i18next** with `uz / ru / en` (auto-detected from Telegram `language_code`)
- **`@twa-dev/sdk`** + native `window.Telegram.WebApp` for haptics, theme, expand
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

### Admin (`/admin`) — all User features plus:
- **Overview:** active users / questions / avg / completed + 7-day trend bars + recent attempts table
- **Questions:** searchable, filterable list with bottom-sheet editor (text, category pills, A–D options, correct-answer toggle)
- **Users:** members of admin's group only, with block/unblock

### Super Admin (`/super`) — all Admin features plus:
- **Overview:** activity heatmap (7d × 24h), audit log, role distribution bars
- **Admins:** promote users to admin or add by Telegram ID + name; demote
- **Users:** all users, filter by role, block/promote/demote
- **Content:** full question bank CRUD
- **Broadcast:** title + body + recipient mode (all / admins / users), preview card, send confirmation toast

## Run locally

```bash
cd app
npm install
npm run dev    # → http://localhost:5173
```

The app uses the demo-role picker in development (no Telegram required). Inside Telegram, the user's TG ID is matched against the seeded user list to auto-route.

## Build

```bash
cd app
npm run build  # → app/dist
```

## Deploy (Vercel)

The repo root has a `vercel.json` that builds from `app/` and sets up SPA rewrites. Either:

1. **CLI:** `vercel` from the repo root, or
2. **Dashboard:** import the repo, leave settings on auto — `vercel.json` handles it.

After deploy, set the Mini App URL via @BotFather:

```
/mybots → @shifokoratbot → Bot Settings → Menu Button → Configure Menu Button
URL: https://<your-vercel-domain>/
```

## State seeding

On first load the persisted store is populated with:
- 102 questions parsed from `savol_javoblar.docx` (each with 3 distractors picked from same-category answers)
- 9 demo users across all roles
- 2 groups
- 24 sample attempts spread over the past 12 days

To wipe: `localStorage.removeItem('shifokorat-state')` in the browser devtools.

## Backend hand-off

When the backend is ready, replace these store actions with API calls:

| Store action | Endpoint shape |
| --- | --- |
| `setTgUser` | `POST /auth/telegram` → returns role |
| `addQuestion / updateQuestion / removeQuestion` | `/questions` |
| `setUserRole / toggleBlock / assignGroup` | `/users/:id` |
| `addGroup / removeGroup` | `/groups` |
| `saveAttempt` | `POST /attempts` |
| `log` | `POST /audit` (optional, server-driven) |

The store interfaces in `src/store/index.ts` are the contract.

## Files

```
app/
  src/
    data/           seed.json + questions.ts (Q&A → MCQ)
    i18n/           uz / ru / en
    lib/            telegram.ts, time.ts
    store/          Zustand persisted store
    components/     Shell, TabBar, LangSwitcher, Icons
    screens/
      Entry.tsx     role picker
      user/         Home, Quiz, Result, History, Profile, UserLayout
      admin/        Overview, Questions, Users, Profile, AdminLayout
      superadmin/   Overview, Admins, AllUsers, Content, Broadcast, SuperLayout
    App.tsx
    main.tsx
    index.css       Tailwind v4 theme + custom CSS vars
  index.html        loads telegram-web-app.js + fonts
vercel.json         build & SPA rewrites
```
