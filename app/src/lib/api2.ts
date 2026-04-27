// v2 API wrappers — bookmarks, achievements, leaderboard, assignments, categories,
// bot_config, broadcast-send, check-answer, web-login. Imported alongside api.ts.

import { supabase } from './supabase'

const FN_BASE = (() => {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
  return url.replace(/\/+$/, '') + '/functions/v1'
})()
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

type Ok<T> = { ok: true; data: T }
type Err = { ok: false; error: string }
type Res<T> = Ok<T> | Err
function err(e: unknown): Err { return { ok: false, error: e instanceof Error ? e.message : String(e) } }

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const session = (await supabase?.auth.getSession())?.data.session
  const token = session?.access_token ?? ANON
  return fetch(`${FN_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      apikey: ANON,
      authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  })
}

// ────────────── BOOKMARKS ──────────────
export type BookmarkRow = { user_id: number; question_id: string; created_at: string }

export async function fetchBookmarks(): Promise<Res<string[]>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('bookmarks').select('question_id').order('created_at', { ascending: false })
  if (error) return err(error.message)
  return { ok: true, data: (data as { question_id: string }[]).map(r => r.question_id) }
}

export async function toggleBookmark(questionId: string, on: boolean): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  if (on) {
    const { error } = await supabase.from('bookmarks').insert({ question_id: questionId })
    if (error && error.code !== '23505') return err(error.message)
  } else {
    const { error } = await supabase.from('bookmarks').delete().eq('question_id', questionId)
    if (error) return err(error.message)
  }
  return { ok: true, data: undefined }
}

// ────────────── ACHIEVEMENTS ──────────────
export type AchievementDef = {
  slug: string
  name_uz: string; name_ru: string; name_en: string
  desc_uz?: string; desc_ru?: string; desc_en?: string
  icon: string; threshold: number
  kind: 'streak' | 'attempts' | 'perfect' | 'category' | 'total_correct' | 'speed' | 'first'
}

export async function fetchAchievements(): Promise<Res<AchievementDef[]>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('achievements').select('*')
  if (error) return err(error.message)
  return { ok: true, data: data as AchievementDef[] }
}

export async function fetchUserAchievements(userId: number): Promise<Res<{ slug: string; unlocked_at: string }[]>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('user_achievements').select('achievement_slug, unlocked_at').eq('user_id', userId)
  if (error) return err(error.message)
  return { ok: true, data: (data as any[]).map(r => ({ slug: r.achievement_slug, unlocked_at: r.unlocked_at })) }
}

export async function unlockAchievement(slug: string): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('user_achievements').insert({ achievement_slug: slug })
  if (error && error.code !== '23505') return err(error.message)
  return { ok: true, data: undefined }
}

// ────────────── LEADERBOARD ──────────────
export type LeaderboardRow = {
  telegram_id: number; name: string; username: string | null; photo_url: string | null
  group_id: string | null; attempts: number; total_correct: number; avg_pct: number; score_index: number
}

export async function fetchLeaderboard(opts: { groupId?: string; limit?: number } = {}): Promise<Res<LeaderboardRow[]>> {
  if (!supabase) return err('disabled')
  let q = supabase.from('leaderboard').select('*').order('score_index', { ascending: false }).limit(opts.limit ?? 100)
  if (opts.groupId) q = q.eq('group_id', opts.groupId)
  const { data, error } = await q
  if (error) return err(error.message)
  return { ok: true, data: data as LeaderboardRow[] }
}

// ────────────── CATEGORIES ──────────────
export type CategoryRow = {
  slug: string
  name_uz: string; name_ru: string; name_en: string
  icon: string | null; sort_order: number; active: boolean
}

export async function fetchCategories(): Promise<Res<CategoryRow[]>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('categories').select('*').eq('active', true).order('sort_order')
  if (error) return err(error.message)
  return { ok: true, data: data as CategoryRow[] }
}

export async function upsertCategory(c: Partial<CategoryRow> & { slug: string }): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('categories').upsert(c, { onConflict: 'slug' })
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

export async function deleteCategory(slug: string): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('categories').update({ active: false }).eq('slug', slug)
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

// ────────────── ASSIGNMENTS ──────────────
export type AssignmentRow = {
  id: string; title: string; description: string | null; group_id: string | null
  created_by: number; question_ids: string[]; time_per_q: number
  deadline: string | null; active: boolean; created_at: string
}

export async function fetchAssignments(): Promise<Res<AssignmentRow[]>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('assignments').select('*').eq('active', true).order('created_at', { ascending: false })
  if (error) return err(error.message)
  return { ok: true, data: data as AssignmentRow[] }
}

export async function createAssignment(a: Omit<AssignmentRow, 'id' | 'created_by' | 'created_at' | 'active'>): Promise<Res<AssignmentRow>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('assignments').insert({
    title: a.title, description: a.description, group_id: a.group_id,
    question_ids: a.question_ids, time_per_q: a.time_per_q, deadline: a.deadline,
  }).select('*').single()
  if (error || !data) return err(error?.message ?? 'no_data')
  return { ok: true, data: data as AssignmentRow }
}

export async function deleteAssignment(id: string): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('assignments').update({ active: false }).eq('id', id)
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

export async function recordAssignmentCompletion(assignmentId: string, attemptId: string, score: number, total: number): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('assignment_completions').insert({
    assignment_id: assignmentId, attempt_id: attemptId, score, total,
  })
  if (error && error.code !== '23505') return err(error.message)
  return { ok: true, data: undefined }
}

// ────────────── BOT CONFIG ──────────────
export async function fetchBotConfig(): Promise<Res<Record<string, any>>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('bot_config').select('key, value')
  if (error) return err(error.message)
  const m: Record<string, any> = {}
  for (const r of (data as any[])) m[r.key] = r.value
  return { ok: true, data: m }
}

export async function updateBotConfig(key: string, value: any): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('bot_config').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

// ────────────── EDGE FUNCTION CALLS ──────────────
export type CheckAnswerResp = {
  correct: boolean
  correct_index: number
  correct_text: string
  explanation: string | null
}

export async function checkAnswer(questionId: string, chosenIndex: number | null, timeMs: number): Promise<Res<CheckAnswerResp>> {
  try {
    const r = await authedFetch('/check-answer', {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, chosen_index: chosenIndex, time_ms: timeMs }),
    })
    if (!r.ok) return err(`http_${r.status}`)
    return { ok: true, data: await r.json() as CheckAnswerResp }
  } catch (e) { return err(e) }
}

export async function sendBroadcast(broadcastId: string): Promise<Res<{ sent: number; failed: number; total: number }>> {
  try {
    const r = await authedFetch('/broadcast-send', { method: 'POST', body: JSON.stringify({ broadcast_id: broadcastId }) })
    if (!r.ok) return err(`http_${r.status}`)
    return { ok: true, data: await r.json() }
  } catch (e) { return err(e) }
}

export async function webLoginByCode(code: string): Promise<Res<{ access_token: string; refresh_token: string; user: any }>> {
  try {
    const r = await fetch(`${FN_BASE}/web-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: ANON, authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ mode: 'code', code }),
    })
    if (!r.ok) return err(`http_${r.status}`)
    return { ok: true, data: await r.json() }
  } catch (e) { return err(e) }
}

export async function webLoginByWidget(payload: Record<string, any>): Promise<Res<{ access_token: string; refresh_token: string; user: any }>> {
  try {
    const r = await fetch(`${FN_BASE}/web-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: ANON, authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ mode: 'widget', payload }),
    })
    if (!r.ok) return err(`http_${r.status}`)
    return { ok: true, data: await r.json() }
  } catch (e) { return err(e) }
}

// ────────────── INSERT BROADCAST + SEND ──────────────
export async function createAndSendBroadcast(senderId: number, recipients: 'all' | 'admins' | 'users', count: number, title: string, body: string) {
  if (!supabase) return err('disabled')
  const { data: ins, error } = await supabase.from('broadcasts').insert({
    sent_by: senderId, recipients, recipient_count: count, title, body,
  }).select('*').single()
  if (error || !ins) return err(error?.message ?? 'insert_failed')
  return sendBroadcast(ins.id)
}
