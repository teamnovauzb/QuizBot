// Typed Supabase wrappers. Each function returns a Result-style tuple.
// The Zustand store calls these when SUPABASE_ENABLED is true; otherwise
// it falls back to its in-memory + localStorage seed.

import { supabase, type Tables } from './supabase'
import type { AppUser, Group, Attempt, Role, AuditEntry } from '../store/types'
import type { Question } from '../data/questions'

type Ok<T> = { ok: true; data: T }
type Err = { ok: false; error: string }
type Res<T> = Ok<T> | Err

function err(e: unknown): Err { return { ok: false, error: e instanceof Error ? e.message : String(e) } }

// ───────────────── USERS ─────────────────
export async function fetchUsers(): Promise<Res<AppUser[]>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('users').select('*').order('last_active', { ascending: false })
  if (error) return err(error.message)
  return { ok: true, data: (data as Tables['users'][]).map(rowToAppUser) }
}

export async function setRole(telegramId: number, role: Role): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('users').update({ role }).eq('telegram_id', telegramId)
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

export async function setBlocked(telegramId: number, blocked: boolean): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('users').update({ blocked }).eq('telegram_id', telegramId)
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

export async function setGroup(telegramId: number, groupId: string | null): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('users').update({ group_id: groupId }).eq('telegram_id', telegramId)
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

export async function upsertUserRow(u: AppUser): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('users').upsert({
    telegram_id: u.telegramId, name: u.name, username: u.username ?? null,
    role: u.role, group_id: u.groupId ?? null, blocked: u.blocked ?? false,
  }, { onConflict: 'telegram_id' })
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

// ───────────────── GROUPS ─────────────────
export async function fetchGroups(): Promise<Res<Group[]>> {
  if (!supabase) return err('disabled')
  const { data: groupsData, error: gErr } = await supabase.from('groups').select('*')
  if (gErr) return err(gErr.message)
  const { data: usersData, error: uErr } = await supabase.from('users').select('telegram_id, group_id')
  if (uErr) return err(uErr.message)

  const memberMap = new Map<string, number[]>()
  for (const u of usersData as { telegram_id: number; group_id: string | null }[]) {
    if (!u.group_id) continue
    const arr = memberMap.get(u.group_id) ?? []
    arr.push(u.telegram_id)
    memberMap.set(u.group_id, arr)
  }

  return {
    ok: true,
    data: (groupsData as Tables['groups'][]).map(g => ({
      id: g.id,
      name: g.name,
      adminId: g.admin_id,
      memberIds: memberMap.get(g.id) ?? [],
    })),
  }
}

export async function createGroup(name: string, adminId: number): Promise<Res<Group>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('groups').insert({ name, admin_id: adminId }).select('*').single()
  if (error) return err(error.message)
  return { ok: true, data: { id: data.id, name: data.name, adminId: data.admin_id, memberIds: [] } }
}

export async function deleteGroup(id: string): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('groups').delete().eq('id', id)
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

// ───────────────── QUESTIONS ─────────────────
export async function fetchQuestions(): Promise<Res<Question[]>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('questions').select('*').eq('active', true).order('number')
  if (error) return err(error.message)
  return {
    ok: true,
    data: (data as Tables['questions'][]).map(r => ({
      id: r.id,
      number: r.number,
      category: r.category,
      question: r.question,
      options: r.options,
      correctIndex: r.correct_index,
      explanation: r.explanation ?? undefined,
    })),
  }
}

export async function createQuestion(q: Omit<Question, 'id' | 'number'>): Promise<Res<Question>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('questions').insert({
    category: q.category, question: q.question, options: q.options, correct_index: q.correctIndex,
  }).select('*').single()
  if (error) return err(error.message)
  return {
    ok: true,
    data: { id: data.id, number: data.number, category: data.category, question: data.question, options: data.options, correctIndex: data.correct_index },
  }
}

export async function updateQuestion(id: string, patch: Partial<Question>): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const update: Record<string, unknown> = {}
  if (patch.question !== undefined) update.question = patch.question
  if (patch.options !== undefined) update.options = patch.options
  if (patch.correctIndex !== undefined) update.correct_index = patch.correctIndex
  if (patch.category !== undefined) update.category = patch.category
  if (patch.explanation !== undefined) update.explanation = patch.explanation
  update.updated_at = new Date().toISOString()
  const { error } = await supabase.from('questions').update(update).eq('id', id)
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

export async function deleteQuestion(id: string): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('questions').update({ active: false }).eq('id', id)
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

// ───────────────── ATTEMPTS ─────────────────
export async function fetchAttempts(forUserId?: number): Promise<Res<Attempt[]>> {
  if (!supabase) return err('disabled')
  let q = supabase.from('attempts').select('*').order('started_at', { ascending: false }).limit(200)
  if (forUserId) q = q.eq('user_id', forUserId)
  const { data, error } = await q
  if (error) return err(error.message)
  return {
    ok: true,
    data: (data as Tables['attempts'][]).map(rowToAttempt),
  }
}

export async function insertAttempt(a: Attempt): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('attempts').insert({
    id: a.id,
    user_id: a.userId,
    category: a.category ?? null,
    started_at: new Date(a.startedAt).toISOString(),
    finished_at: new Date(a.finishedAt).toISOString(),
    duration_ms: a.durationMs,
    score: a.score,
    total: a.total,
    question_ids: a.questionIds,
    answers: a.answers,
  })
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

// ───────────────── AUDIT ─────────────────
export async function fetchAudit(limit = 50): Promise<Res<AuditEntry[]>> {
  if (!supabase) return err('disabled')
  const { data, error } = await supabase.from('audit').select('*').order('ts', { ascending: false }).limit(limit)
  if (error) return err(error.message)
  return {
    ok: true,
    data: (data as Tables['audit'][]).map(r => ({
      id: r.id,
      ts: new Date(r.ts).getTime(),
      actor: r.actor_id,
      actorRole: r.actor_role,
      action: r.action,
      target: r.target ?? undefined,
    })),
  }
}

export async function logAudit(actor: number, actorRole: Role, action: string, target?: string): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('audit').insert({
    actor_id: actor, actor_role: actorRole, action, target: target ?? null,
  })
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

// ───────────────── BROADCAST ─────────────────
export async function recordBroadcast(senderId: number, recipients: 'all' | 'admins' | 'users', count: number, title: string, body: string): Promise<Res<void>> {
  if (!supabase) return err('disabled')
  const { error } = await supabase.from('broadcasts').insert({
    sent_by: senderId, recipients, recipient_count: count, title, body,
  })
  if (error) return err(error.message)
  return { ok: true, data: undefined }
}

// ───────────────── helpers ─────────────────
function rowToAppUser(r: Tables['users']): AppUser {
  return {
    telegramId: r.telegram_id,
    name: r.name,
    username: r.username ?? undefined,
    role: r.role,
    groupId: r.group_id ?? undefined,
    blocked: r.blocked,
    joinedAt: new Date(r.joined_at).getTime(),
    lastActive: new Date(r.last_active).getTime(),
  }
}

function rowToAttempt(r: Tables['attempts']): Attempt {
  return {
    id: r.id,
    userId: r.user_id,
    category: r.category ?? undefined,
    startedAt: new Date(r.started_at).getTime(),
    finishedAt: r.finished_at ? new Date(r.finished_at).getTime() : Date.now(),
    durationMs: r.duration_ms ?? 0,
    questionIds: r.question_ids,
    answers: r.answers,
    score: r.score,
    total: r.total,
  }
}
