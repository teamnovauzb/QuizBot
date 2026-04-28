// Simplified Home — single big "Start" CTA with sensible defaults.
// All quiz settings (count / time / category) live in /u/settings.
// Defaults pulled from bot_config (or hardcoded fallback: 10 questions, 30s, all).

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { Card, PageHeader } from '../../components/Shell'
import { LangSwitcher } from '../../components/LangSwitcher'
import { ArrowIcon, FlameIcon, BookIcon, ClockIcon, XIcon } from '../../components/Icons'
import { haptic } from '../../lib/telegram'
import { relTime } from '../../lib/time'
import clsx from 'clsx'
import { fetchAssignments, fetchBotConfig, type AssignmentRow } from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'

const QUICK_COUNTS = [10, 20, 30] as const

type Defaults = { count: number; time: number }

export default function UserHome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tgUser = useStore(s => s.tgUser)
  const _attemptsRaw = useStore(s => s.attempts)
  const userAttempts = useMemo(() => _attemptsRaw.filter(a => a.userId === tgUser?.id), [_attemptsRaw, tgUser?.id])

  const stats = useMemo(() => {
    if (!userAttempts.length) return { score: 0, streak: 0, accuracy: 0, completed: 0 }
    const totalCorrect = userAttempts.reduce((s, a) => s + a.score, 0)
    const totalQ = userAttempts.reduce((s, a) => s + a.total, 0)
    const accuracy = totalQ ? Math.round((totalCorrect / totalQ) * 100) : 0
    const days = new Set(userAttempts.map(a => new Date(a.startedAt).toISOString().slice(0, 10)))
    let streak = 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (let i = 0; ; i++) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10)
      if (days.has(d)) streak++; else break
    }
    return { score: totalCorrect, streak, accuracy, completed: userAttempts.length }
  }, [userAttempts])

  const wrongCount = useMemo(() => {
    const ids = new Set<string>()
    for (const a of userAttempts) for (const ans of a.answers) if (!ans.correct) ids.add(ans.questionId)
    return ids.size
  }, [userAttempts])

  const bookmarks = useStore(s => s.bookmarks)

  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [defaults, setDefaults] = useState<Defaults>({ count: 10, time: 30 })

  useEffect(() => {
    if (!SUPABASE_ENABLED) return
    fetchAssignments().then(r => { if (r.ok) setAssignments(r.data) })
    fetchBotConfig().then(r => {
      if (!r.ok) return
      setDefaults({
        count: Number(r.data.default_quiz_count) || 10,
        time: Number(r.data.default_time_per_q) || 30,
      })
    })
  }, [])

  function start(count = defaults.count) {
    haptic('medium')
    navigate(`/u/quiz?count=${count}&time=${defaults.time}`)
  }

  return (
    <div className="pb-32">
      <PageHeader
        title={`${t('home.greeting')}, ${tgUser?.first_name?.split(' ')[0] ?? '...'}`}
        eyebrow={t('app.tagline')}
        right={<LangSwitcher />}
      />

      {/* Compact stats — 4 in a row */}
      <section className="px-5 mt-2 grid grid-cols-4 gap-2 fade-up">
        <MiniStat label={t('home.completed').slice(0, 8)} value={stats.completed} />
        <MiniStat label={t('home.streak').slice(0, 6)} value={stats.streak} icon={<FlameIcon className="w-3 h-3 stroke-[var(--accent)]" />} />
        <MiniStat label={t('home.accuracy').slice(0, 8)} value={stats.completed ? `${stats.accuracy}%` : '—'} />
        <MiniStat label="pt" value={stats.score} accent />
      </section>

      {/* PRIMARY CTA — one giant button */}
      <section className="px-5 mt-5 fade-up" style={{ animationDelay: '0.05s' }}>
        <button
          onClick={() => start()}
          className="w-full rounded-3xl bg-[var(--accent)] text-[var(--bg)] p-5 flex items-center gap-3 active:scale-[0.99] shadow-[0_8px_32px_-8px_var(--accent-glow)]"
        >
          <div className="text-left flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] font-mono opacity-70">{t('home.quickStart')}</div>
            <div className="font-display font-bold text-2xl leading-tight mt-0.5">{t('home.startQuiz')}</div>
            <div className="text-xs opacity-80 mt-1 font-mono">{defaults.count} · {defaults.time}s</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-[var(--bg)]/15 grid place-items-center">
            <ArrowIcon className="w-5 h-5 stroke-current" />
          </div>
        </button>
      </section>

      {/* QUICK COUNT chips */}
      <section className="px-5 mt-4 grid grid-cols-3 gap-2 fade-up" style={{ animationDelay: '0.1s' }}>
        {QUICK_COUNTS.map(n => (
          <button
            key={n}
            onClick={() => start(n)}
            className="rounded-2xl glass border border-[var(--hairline-strong)] py-3 active:scale-[0.99]"
          >
            <div className="font-display font-bold text-lg">{n}</div>
            <div className="text-[9px] uppercase tracking-[0.18em] font-mono text-[var(--text-muted)]">{t('home.questions')}</div>
          </button>
        ))}
      </section>

      {/* ASSIGNMENTS */}
      {assignments.length > 0 && (
        <section className="px-5 mt-6 fade-up">
          <SectionLabel>{t('nav.assignments')}</SectionLabel>
          <ul className="space-y-2">
            {assignments.slice(0, 2).map(a => (
              <Card key={a.id} className="p-4" onClick={() => navigate(`/u/quiz?ids=${a.question_ids.join(',')}&time=${a.time_per_q}&assignment=${a.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] shrink-0 mt-0.5">A</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-base truncate">{a.title}</div>
                    <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--text-muted)]">
                      {a.question_ids.length} {t('home.questions')} · {a.time_per_q}s
                      {a.deadline && ` · ${new Date(a.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                    </div>
                  </div>
                  <ArrowIcon className="w-4 h-4 stroke-[var(--text-muted)]" />
                </div>
              </Card>
            ))}
          </ul>
        </section>
      )}

      {/* SHORTCUTS — wrong-only + bookmarks */}
      {(wrongCount > 0 || bookmarks.length > 0) && (
        <section className="px-5 mt-5 grid grid-cols-2 gap-2 fade-up">
          {wrongCount > 0 && (
            <Card className="p-3 flex items-center gap-3" onClick={() => navigate('/u/quiz?wrong=1&time=45')}>
              <div className="w-9 h-9 rounded-full bg-[#3D1218]/15 grid place-items-center text-[#F87171] shrink-0">
                <XIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold text-sm truncate">{t('home.wrongOnly')}</div>
                <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--text-muted)]">{wrongCount}</div>
              </div>
            </Card>
          )}
          {bookmarks.length > 0 && (
            <Card className="p-3 flex items-center gap-3" onClick={() => navigate('/u/bookmarks')}>
              <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] grid place-items-center text-[var(--accent)] shrink-0">
                <BookIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold text-sm truncate">{t('nav.bookmarks')}</div>
                <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--text-muted)]">{bookmarks.length}</div>
              </div>
            </Card>
          )}
        </section>
      )}

      {/* RECENT */}
      {userAttempts.length > 0 && (
        <section className="px-5 mt-7 fade-up">
          <SectionLabel>{t('home.recent')}</SectionLabel>
          <ul className="space-y-2">
            {userAttempts.slice(0, 3).map(a => {
              const pct = Math.round((a.score / a.total) * 100)
              return (
                <Card key={a.id} className="p-3 flex items-center gap-3" onClick={() => navigate(`/u/result/${a.id}`)}>
                  <div className={clsx(
                    'font-display font-bold text-2xl tabular w-12 text-center shrink-0',
                    pct >= 70 ? 'text-[var(--accent)]' : pct >= 40 ? 'text-[var(--text)]' : 'text-[var(--text-muted)]',
                  )}>{pct}<span className="text-xs opacity-60">%</span></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--accent)]">{a.category ?? t('common.all')}</div>
                    <div className="font-display font-semibold text-sm">{a.score}/{a.total}</div>
                    <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 font-mono">
                      <ClockIcon className="w-3 h-3" />
                      <span>{relTime(a.startedAt, t)}</span>
                    </div>
                  </div>
                  <ArrowIcon className="w-4 h-4 stroke-[var(--text-muted)]" />
                </Card>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function MiniStat({ label, value, icon, accent }: { label: string; value: number | string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={clsx(
      'rounded-2xl p-2.5 text-center border',
      accent ? 'bg-[var(--accent)] text-[var(--bg)] border-transparent' : 'glass border-[var(--hairline)]',
    )}>
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {icon}
        <span className="text-[9px] uppercase tracking-[0.18em] font-mono opacity-70 truncate">{label}</span>
      </div>
      <div className="font-display font-bold text-lg leading-none tabular">{value}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.22em] font-mono text-[var(--text-muted)] mb-2">
      {children}
    </div>
  )
}
