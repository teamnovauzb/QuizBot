import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { QUESTIONS, type Question } from '../data/questions'

export type Role = 'user' | 'admin' | 'superadmin'

export type TelegramUser = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

export type AppUser = {
  telegramId: number
  name: string
  username?: string
  role: Role
  groupId?: string
  blocked?: boolean
  joinedAt: number
  lastActive: number
}

export type Group = {
  id: string
  name: string
  adminId: number
  memberIds: number[]
}

export type Attempt = {
  id: string
  userId: number
  startedAt: number
  finishedAt: number
  durationMs: number
  questionIds: string[]
  answers: { questionId: string; chosenIndex: number | null; correct: boolean; timeMs: number }[]
  score: number
  total: number
  category?: string
}

export type AuditEntry = {
  id: string
  ts: number
  actor: number
  actorRole: Role
  action: string
  target?: string
}

type State = {
  hydrated: boolean
  tgUser: TelegramUser | null
  currentRole: Role
  language: 'uz' | 'ru' | 'en'

  users: AppUser[]
  groups: Group[]
  questions: Question[]
  attempts: Attempt[]
  audit: AuditEntry[]

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
}

// Seed roles deterministically: first telegram user is super, plus a few demo records
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

// Seed attempts
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

export const useStore = create<State>()(persist((set, get) => ({
  hydrated: false,
  tgUser: null,
  currentRole: 'user',
  language: 'uz',

  users: seedUsers,
  groups: seedGroups,
  questions: QUESTIONS,
  attempts: seedAttempts,
  audit: [],

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

  upsertUser: (u) => set(s => ({
    users: s.users.find(x => x.telegramId === u.telegramId)
      ? s.users.map(x => x.telegramId === u.telegramId ? u : x)
      : [...s.users, u],
  })),
  removeUser: (id) => set(s => ({ users: s.users.filter(u => u.telegramId !== id) })),
  setUserRole: (id, role) => set(s => ({ users: s.users.map(u => u.telegramId === id ? { ...u, role } : u) })),
  toggleBlock: (id) => set(s => ({ users: s.users.map(u => u.telegramId === id ? { ...u, blocked: !u.blocked } : u) })),
  assignGroup: (id, groupId) => set(s => ({ users: s.users.map(u => u.telegramId === id ? { ...u, groupId } : u) })),

  addGroup: (name, adminId) => {
    const g: Group = { id: `g-${Date.now().toString(36)}`, name, adminId, memberIds: [] }
    set(s => ({ groups: [...s.groups, g] }))
    return g
  },
  removeGroup: (id) => set(s => ({ groups: s.groups.filter(g => g.id !== id) })),

  addQuestion: (q) => set(s => ({
    questions: [...s.questions, { ...q, id: `q-${Date.now().toString(36)}`, number: s.questions.length + 1 }],
  })),
  updateQuestion: (id, patch) => set(s => ({ questions: s.questions.map(q => q.id === id ? { ...q, ...patch } as Question : q) })),
  removeQuestion: (id) => set(s => ({ questions: s.questions.filter(q => q.id !== id) })),

  saveAttempt: (a) => set(s => ({ attempts: [a, ...s.attempts] })),
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
  },
}), {
  name: 'shifokorat-state',
  partialize: (s) => ({
    users: s.users,
    groups: s.groups,
    questions: s.questions,
    attempts: s.attempts,
    audit: s.audit,
    language: s.language,
  }),
}))
