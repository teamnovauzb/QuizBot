import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const SUPABASE_ENABLED = Boolean(url && key)

export const supabase: SupabaseClient | null = SUPABASE_ENABLED
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        storageKey: 'shifokorat-supabase-auth',
        autoRefreshToken: true,
      },
    })
  : null

export type Tables = {
  users: {
    telegram_id: number
    auth_uid: string | null
    username: string | null
    name: string
    photo_url: string | null
    language: string
    role: 'user' | 'admin' | 'superadmin'
    group_id: string | null
    blocked: boolean
    joined_at: string
    last_active: string
  }
  groups: {
    id: string
    name: string
    admin_id: number
    created_at: string
  }
  questions: {
    id: string
    number: number
    category: string
    question: string
    options: string[]
    correct_index: number
    explanation: string | null
    active: boolean
    created_by: number | null
    created_at: string
    updated_at: string
  }
  attempts: {
    id: string
    user_id: number
    category: string | null
    started_at: string
    finished_at: string | null
    duration_ms: number | null
    score: number
    total: number
    question_ids: string[]
    answers: { questionId: string; chosenIndex: number | null; correct: boolean; timeMs: number }[]
  }
  audit: {
    id: string
    ts: string
    actor_id: number
    actor_role: 'user' | 'admin' | 'superadmin'
    action: string
    target: string | null
  }
  broadcasts: {
    id: string
    sent_at: string
    sent_by: number
    recipients: 'all' | 'admins' | 'users'
    recipient_count: number
    title: string
    body: string
  }
}
