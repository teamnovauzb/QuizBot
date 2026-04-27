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
  phone?: string
  phoneVerified?: boolean
  photoUrl?: string
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
