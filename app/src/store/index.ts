import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { QUESTIONS, type Question } from '../data/questions'
import * as api from '../lib/api'
import * as api2 from '../lib/api2'
import { SUPABASE_ENABLED } from '../lib/supabase'
import type { AppUser, Attempt, AuditEntry, Group, Role, TelegramUser } from './types'

export type { AppUser, Attempt, AuditEntry, Group, Role, TelegramUser } from './types'

type State = {
  hydrated: boolean
  syncing: boolean
  syncError: string | null
  tgUser: TelegramUser | null
  currentRole: Role
  language: 'uz' | 'ru' | 'en'

  users: AppUser[]
  groups: Group[]
  questions: Question[]
  attempts: Attempt[]
  audit: AuditEntry[]
  bookmarks: string[]
  unlockedAchievements: string[]

  setTgUser: (u: TelegramUser) => void
  setRole: (r: Role) => void
  setLanguage: (l: 'uz' | 'ru' | 'en') => void

  upsertUser: (u: AppUser) => void
  removeUser: (telegramId: number) => void
  setUserRole: (telegramId: number, role: Role) => void
  toggleBlock: (telegramId: number) => void
  assignGroup: (telegramId: number, groupId?: string) => void

  addGroup: (name: string, adminId: number) => Group
  removeGroup: (id: string) => void

  addQuestion: (q: Omit<Question, 'id' | 'number'>) => void
  updateQuestion: (id: string, q: Partial<Question>) => void
  removeQuestion: (id: string) => void

  saveAttempt: (a: Attempt) => void
  log: (action: string, target?: string) => void

  toggleBookmark: (questionId: string) => void
  unlockAchievement: (slug: string) => void

  setPhone: (telegramId: number, phone: string) => void

  hydrateFromSupabase: () => Promise<void>
}

// ─────────── seed data (used when Supabase is disabled) ───────────
const seedUsers: AppUser[] = [
  { telegramId: 100001, name: 'Asadbek Karimov', username: 'asadbek', role: 'superadmin', joinedAt: Date.now() - 86400000 * 90, lastActive: Date.now() - 1000 * 60 * 12 },
  { telegramId: 200001, name: 'Dilnoza Yusupova', username: 'dilnoza_y', role: 'admin', joinedAt: Date.now() - 86400000 * 60, lastActive: Date.now() - 1000 * 60 * 45, groupId: 'g1' },
  { telegramId: 200002, name: 'Bekzod Tursunov', username: 'bek_t', role: 'admin', joinedAt: Date.now() - 86400000 * 50, lastActive: Date.now() - 1000 * 60 * 60 * 3, groupId: 'g2' },
  { telegramId: 300001, name: 'Madina Ismoilova', username: 'madinai', role: 'user', joinedAt: Date.now() - 86400000 * 30, lastActive: Date.now() - 1000 * 60 * 25, groupId: 'g1' },
  { telegramId: 300002, name: 'Sardor Aliyev', username: 's_aliev', role: 'user', joinedAt: Date.now() - 86400000 * 22, lastActive: Date.now() - 1000 * 60 * 60 * 9, groupId: 'g1' },
  { telegramId: 300003, name: 'Nilufar Saidova', username: 'niluffar', role: 'user', joinedAt: Date.now() - 86400000 * 18, lastActive: Date.now() - 1000 * 60 * 60 * 26, groupId: 'g2' },
  { telegramId: 300004, name: 'Jasur Olimov', username: 'jasur_o', role: 'user', joinedAt: Date.now() - 86400000 * 15, lastActive: Date.now() - 1000 * 60 * 60 * 12, groupId: 'g2' },
  { telegramId: 300005, name: 'Zarina Hamidova', username: 'zarinah', role: 'user', blocked: true, joinedAt: Date.now() - 86400000 * 10, lastActive: Date.now() - 1000 * 60 * 60 * 80, groupId: 'g1' },
  { telegramId: 300006, name: 'Otabek Yusupov', username: 'otabekk', role: 'user', joinedAt: Date.now() - 86400000 * 6, lastActive: Date.now() - 1000 * 60 * 60 * 1.5, groupId: 'g2' },
]

const seedGroups: Group[] = [
  { id: 'g1', name: 'Guruh 101 — Tibbiyot fakulteti', adminId: 200001, memberIds: [300001, 300002, 300005] },
  { id: 'g2', name: 'Guruh 202 — Stomatologiya', adminId: 200002, memberIds: [300003, 300004, 300006] },
]

const seedAttempts: Attempt[] = []
const userIds = [300001, 300002, 300003, 300004, 300006]
for (let i = 0; i < 24; i++) {
  const uid = userIds[i % userIds.length]
  const startedAt = Date.now() - 86400000 * (i / 2 + 0.3) - i * 1000 * 60 * 17
  const total = 10
  const score = Math.floor(4 + Math.random() * 7)
  seedAttempts.push({
    id: `att-${i}`,
    userId: uid,
    startedAt,
    finishedAt: startedAt + 1000 * 60 * (3 + Math.random() * 5),
    durationMs: 1000 * 60 * (3 + Math.random() * 5),
    questionIds: QUESTIONS.slice(i % 50, (i % 50) + total).map(q => q.id),
    answers: [],
    score,
    total,
    category: ['Excel', 'Word', 'Hardware', 'Cloud', 'OS'][i % 5],
  })
}

// fire-and-forget helper: log Supabase errors but never throw
function fnf<T>(p: Promise<T>) { p.catch(e => console.warn('[supabase]', e)) }

export const useStore = create<State>()(persist((set, get) => ({
  hydrated: false,
  syncing: false,
  syncError: null,
  tgUser: null,
  currentRole: 'user',
  language: 'uz',

  users: seedUsers,
  groups: seedGroups,
  questions: QUESTIONS,
  attempts: seedAttempts,
  audit: [],
  bookmarks: [],
  unlockedAchievements: [],

  setTgUser: (u) => {
    const exists = get().users.find(x => x.telegramId === u.id)
    if (!exists) {
      const newUser: AppUser = {
        telegramId: u.id,
        name: [u.first_name, u.last_name].filter(Boolean).join(' '),
        username: u.username,
        role: 'user',
        joinedAt: Date.now(),
        lastActive: Date.now(),
      }
      set({ users: [...get().users, newUser], tgUser: u, currentRole: 'user' })
      if (SUPABASE_ENABLED) fnf(api.upsertUserRow(newUser))
    } else {
      set({
        tgUser: u,
        currentRole: exists.role,
        users: get().users.map(x => x.telegramId === u.id ? { ...x, lastActive: Date.now() } : x),
      })
    }
  },
  setRole: (r) => set({ currentRole: r }),
  setLanguage: (l) => {
    set({ language: l })
    localStorage.setItem('lang', l)
  },

  upsertUser: (u) => {
    set(s => ({
      users: s.users.find(x => x.telegramId === u.telegramId)
        ? s.users.map(x => x.telegramId === u.telegramId ? u : x)
        : [...s.users, u],
    }))
    if (SUPABASE_ENABLED) fnf(api.upsertUserRow(u))
  },
  removeUser: (id) => set(s => ({ users: s.users.filter(u => u.telegramId !== id) })),
  setUserRole: (id, role) => {
    set(s => ({ users: s.users.map(u => u.telegramId === id ? { ...u, role } : u) }))
    if (SUPABASE_ENABLED) fnf(api.setRole(id, role))
  },
  toggleBlock: (id) => {
    const cur = get().users.find(u => u.telegramId === id)
    const next = !cur?.blocked
    set(s => ({ users: s.users.map(u => u.telegramId === id ? { ...u, blocked: next } : u) }))
    if (SUPABASE_ENABLED) fnf(api.setBlocked(id, next))
  },
  assignGroup: (id, groupId) => {
    set(s => ({ users: s.users.map(u => u.telegramId === id ? { ...u, groupId } : u) }))
    if (SUPABASE_ENABLED) fnf(api.setGroup(id, groupId ?? null))
  },

  addGroup: (name, adminId) => {
    const local: Group = { id: `g-${Date.now().toString(36)}`, name, adminId, memberIds: [] }
    set(s => ({ groups: [...s.groups, local] }))
    if (SUPABASE_ENABLED) {
      api.createGroup(name, adminId).then(r => {
        if (r.ok) set(s => ({ groups: s.groups.map(g => g.id === local.id ? r.data : g) }))
      })
    }
    return local
  },
  removeGroup: (id) => {
    set(s => ({ groups: s.groups.filter(g => g.id !== id) }))
    if (SUPABASE_ENABLED) fnf(api.deleteGroup(id))
  },

  addQuestion: (q) => {
    const local: Question = { ...q, id: `q-${Date.now().toString(36)}`, number: get().questions.length + 1 }
    set(s => ({ questions: [...s.questions, local] }))
    if (SUPABASE_ENABLED) {
      api.createQuestion(q).then(r => {
        if (r.ok) set(s => ({ questions: s.questions.map(x => x.id === local.id ? r.data : x) }))
      })
    }
  },
  updateQuestion: (id, patch) => {
    set(s => ({ questions: s.questions.map(q => q.id === id ? { ...q, ...patch } as Question : q) }))
    if (SUPABASE_ENABLED && !id.startsWith('q-')) fnf(api.updateQuestion(id, patch))
  },
  removeQuestion: (id) => {
    set(s => ({ questions: s.questions.filter(q => q.id !== id) }))
    if (SUPABASE_ENABLED && !id.startsWith('q-')) fnf(api.deleteQuestion(id))
  },

  saveAttempt: (a) => {
    set(s => ({ attempts: [a, ...s.attempts] }))
    if (SUPABASE_ENABLED) fnf(api.insertAttempt(a))
  },

  toggleBookmark: (questionId) => {
    const has = get().bookmarks.includes(questionId)
    set(s => ({ bookmarks: has ? s.bookmarks.filter(x => x !== questionId) : [questionId, ...s.bookmarks] }))
    if (SUPABASE_ENABLED) fnf(api2.toggleBookmark(questionId, !has))
  },
  setPhone: (telegramId, phone) => {
    set(s => ({
      users: s.users.map(u => u.telegramId === telegramId ? { ...u, phone, phoneVerified: true } : u),
    }))
  },
  unlockAchievement: (slug) => {
    if (get().unlockedAchievements.includes(slug)) return
    set(s => ({ unlockedAchievements: [slug, ...s.unlockedAchievements] }))
    if (SUPABASE_ENABLED) fnf(api2.unlockAchievement(slug))
  },
  log: (action, target) => {
    const u = get().tgUser
    if (!u) return
    const e: AuditEntry = {
      id: `a-${Date.now().toString(36)}`,
      ts: Date.now(),
      actor: u.id,
      actorRole: get().currentRole,
      action,
      target,
    }
    set(s => ({ audit: [e, ...s.audit].slice(0, 200) }))
    if (SUPABASE_ENABLED) fnf(api.logAudit(u.id, get().currentRole, action, target))
  },

  hydrateFromSupabase: async () => {
    if (!SUPABASE_ENABLED) return
    set({ syncing: true, syncError: null })
    const [users, groups, questions, attempts, audit, bookmarks] = await Promise.all([
      api.fetchUsers(),
      api.fetchGroups(),
      api.fetchQuestions(),
      api.fetchAttempts(),
      api.fetchAudit(),
      api2.fetchBookmarks(),
    ])
    if (!users.ok) { set({ syncing: false, syncError: users.error }); return }
    if (!groups.ok) { set({ syncing: false, syncError: groups.error }); return }
    if (!questions.ok) { set({ syncing: false, syncError: questions.error }); return }
    if (!attempts.ok) { set({ syncing: false, syncError: attempts.error }); return }
    const tgu = get().tgUser
    if (tgu) {
      const ua = await api2.fetchUserAchievements(tgu.id)
      if (ua.ok) set({ unlockedAchievements: ua.data.map(x => x.slug) })
    }
    set({
      users: users.data.length ? users.data : get().users,
      groups: groups.data.length ? groups.data : get().groups,
      questions: questions.data.length ? questions.data : get().questions,
      attempts: attempts.data.length ? attempts.data : get().attempts,
      audit: audit.ok ? audit.data : get().audit,
      bookmarks: bookmarks.ok ? bookmarks.data : get().bookmarks,
      hydrated: true,
      syncing: false,
      syncError: null,
    })
  },
}), {
  name: 'shifokorat-state',
  partialize: (s) => ({
    users: s.users,
    groups: s.groups,
    questions: s.questions,
    attempts: s.attempts,
    audit: s.audit,
    bookmarks: s.bookmarks,
    unlockedAchievements: s.unlockedAchievements,
    language: s.language,
  }),
}))
