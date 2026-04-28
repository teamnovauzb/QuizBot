import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { CATEGORIES } from '../../data/questions'
import { Card, PageHeader } from '../../components/Shell'
import { LangSwitcher } from '../../components/LangSwitcher'
import { ArrowIcon, FlameIcon, SparkleIcon, BookIcon, ClockIcon, XIcon } from '../../components/Icons'
import { haptic } from '../../lib/telegram'
import { relTime } from '../../lib/time'
import clsx from 'clsx'
import { fetchAssignments, type AssignmentRow } from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'

const COUNT_OPTIONS = [10, 20, 30]
const TIME_OPTIONS = [15, 30, 45, 60]

export default function UserHome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tgUser = useStore(s => s.tgUser)
  const attempts = useStore(s => s.attempts)
  const userAttempts = useMemo(() => attempts.filter(a => a.userId === tgUser?.id), [attempts, tgUser?.id])

  const stats = useMemo(() => {
    if (!userAttempts.length) return { score: 0, streak: 0, accuracy: 0, completed: 0, best: 0 }
    const totalCorrect = userAttempts.reduce((s, a) => s + a.score, 0)
    const totalQ = userAttempts.reduce((s, a) => s + a.total, 0)
    const accuracy = totalQ ? Math.round((totalCorrect / totalQ) * 100) : 0
    const best = Math.max(...userAttempts.map(a => Math.round((a.score / a.total) * 100)))
    // real streak from days
    const days = new Set(userAttempts.map(a => new Date(a.startedAt).toISOString().slice(0, 10)))
    let streak = 0
    const today = new Date()
    today.setHours(0,0,0,0)
    for (let i = 0; ; i++) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10)
      if (days.has(d)) streak++
      else break
    }
    return { score: totalCorrect, streak, accuracy, completed: userAttempts.length, best }
  }, [userAttempts])

  // wrong-answers count for review CTA
  const wrongCount = useMemo(() => {
    const ids = new Set<string>()
    for (const a of userAttempts) for (const ans of a.answers) if (!ans.correct) ids.add(ans.questionId)
    return ids.size
  }, [userAttempts])

  const bookmarks = useStore(s => s.bookmarks)

  const [cat, setCat] = useState<string>('all')
  const [count, setCount] = useState(10)
  const [perQ, setPerQ] = useState(30)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  useEffect(() => {
    if (!SUPABASE_ENABLED) return
    fetchAssignments().then(r => { if (r.ok) setAssignments(r.data) })
  }, [])

  function start() {
    haptic('medium')
    const params = new URLSearchParams({
      count: String(count),
      time: String(perQ),
      ...(cat !== 'all' ? { cat } : {}),
    })
    navigate(`/u/quiz?${params}`)
  }

  return (
    <div className="pb-28">
      <PageHeader
        eyebrow={`№ ${(tgUser?.id ?? 0).toString().padStart(6, '0').slice(-6)} · ${t('app.tagline')}`}
        title={t('home.greeting') + ', ' + (tgUser?.first_name?.split(' ')[0] ?? '...') + '.'}
        right={<LangSwitcher />}
      />

      {/* STATS — editorial 4-up */}
      <section className="px-5 mt-2 grid grid-cols-2 gap-3 paper-rise" style={{ animationDelay: '0.1s' }}>
        <StatTile label={t('home.yourScore')} value={stats.score} unit="pt" accent />
        <StatTile label={t('home.streak')} value={stats.streak} unit="d" icon={<FlameIcon />} />
        <StatTile label={t('home.accuracy')} value={stats.accuracy} unit="%" />
        <StatTile label={t('home.completed')} value={stats.completed} />
      </section>

      {/* ASSIGNMENTS — first if any */}
      {assignments.length > 0 && (
        <section className="px-5 mt-6 paper-rise">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--ink-soft)] opacity-70">{t('nav.assignments')}</span>
          </div>
          <ul className="space-y-2">
            {assignments.slice(0, 2).map(a => (
              <Card key={a.id} className="p-4" onClick={() => navigate(`/u/quiz?ids=${a.question_ids.join(',')}&time=${a.time_per_q}&assignment=${a.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] shrink-0 mt-0.5">A</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg truncate">{a.title}</div>
                    <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)]">
                      {a.question_ids.length} {t('home.questions')} · {a.time_per_q}s/q
                      {a.deadline && ` · ${new Date(a.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                    </div>
                  </div>
                  <ArrowIcon className="w-4 h-4 stroke-[var(--ink-soft)]" />
                </div>
              </Card>
            ))}
          </ul>
        </section>
      )}

      {/* TODAY'S FOCUS — Big editorial CTA */}
      <section className="px-5 mt-6 paper-rise" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--ink-soft)] opacity-70">{t('home.todaysFocus')}</span>
          <SparkleIcon className="w-3 h-3 stroke-[var(--accent)]" />
        </div>
        <Card className="p-5 relative overflow-hidden" onClick={start}>
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-[var(--accent)] opacity-[0.08] blur-2xl" />
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--accent)]">{t('home.quickStart')}</div>
              <div className="font-display text-[40px] leading-[0.95] mt-1">10 savol</div>
              <div className="text-xs text-[var(--ink-soft)] mt-1 font-mono">30s · {t('common.all')}</div>
            </div>
            <div className="w-14 h-14 rounded-full bg-[var(--ink)] grid place-items-center">
              <ArrowIcon className="w-5 h-5 stroke-[var(--paper)]" />
            </div>
          </div>
        </Card>
      </section>

      {/* SHORTCUTS — wrong-answers + bookmarks + achievements */}
      {(wrongCount > 0 || bookmarks.length > 0) && (
        <section className="px-5 mt-5 grid grid-cols-2 gap-2 paper-rise">
          {wrongCount > 0 && (
            <Card className="p-3 flex items-center gap-3" onClick={() => navigate('/u/quiz?wrong=1&time=45')}>
              <div className="w-9 h-9 rounded-full bg-[#3D1218]/20 grid place-items-center text-[#F87171] shrink-0">
                <XIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm truncate">{t('home.wrongOnly')}</div>
                <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)]">{wrongCount}</div>
              </div>
            </Card>
          )}
          {bookmarks.length > 0 && (
            <Card className="p-3 flex items-center gap-3" onClick={() => navigate('/u/bookmarks')}>
              <div className="w-9 h-9 rounded-full bg-[var(--accent)]/20 grid place-items-center text-[var(--accent)] shrink-0">
                <BookIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm truncate">{t('nav.bookmarks')}</div>
                <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)]">{bookmarks.length}</div>
              </div>
            </Card>
          )}
        </section>
      )}

      {/* CATEGORY */}
      <section className="px-5 mt-7 paper-rise" style={{ animationDelay: '0.25s' }}>
        <Label num="II." text={t('home.chooseCategory')} />
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
          <Pill active={cat === 'all'} onClick={() => setCat('all')}>{t('common.all')}</Pill>
          {CATEGORIES.map(c => (
            <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{t(`cat.${c}`, { defaultValue: c })}</Pill>
          ))}
        </div>
      </section>

      {/* COUNT */}
      <section className="px-5 mt-5 paper-rise" style={{ animationDelay: '0.3s' }}>
        <Label num="III." text={t('home.chooseCount')} />
        <div className="grid grid-cols-3 gap-2">
          {COUNT_OPTIONS.map(n => (
            <button key={n}
              onClick={() => { setCount(n); haptic('light') }}
              className={clsx(
                'rounded-xl py-3 text-center border transition-colors',
                count === n
                  ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                  : 'bg-[var(--paper-2)] border-[var(--hairline)] text-[var(--ink)]'
              )}
            >
              <div className="font-display text-2xl numerals leading-none">{n}</div>
              <div className="text-[10px] uppercase font-mono tracking-[0.18em] mt-1 opacity-70">{t('home.questions')}</div>
            </button>
          ))}
        </div>
      </section>

      {/* TIME */}
      <section className="px-5 mt-5 paper-rise" style={{ animationDelay: '0.35s' }}>
        <Label num="IV." text={t('home.chooseTime')} />
        <div className="grid grid-cols-4 gap-2">
          {TIME_OPTIONS.map(n => (
            <button key={n}
              onClick={() => { setPerQ(n); haptic('light') }}
              className={clsx(
                'rounded-xl py-3 text-center border transition-colors',
                perQ === n
                  ? 'bg-[var(--accent)] text-[var(--ink)] border-[var(--accent)]'
                  : 'bg-[var(--paper-2)] border-[var(--hairline)] text-[var(--ink)]'
              )}
            >
              <div className="font-display text-xl numerals leading-none">{n}<span className="text-xs opacity-60">s</span></div>
            </button>
          ))}
        </div>
      </section>

      {/* START */}
      <section className="px-5 mt-7 paper-rise" style={{ animationDelay: '0.4s' }}>
        <button
          onClick={start}
          className="w-full rounded-2xl bg-[var(--ink)] text-[var(--paper)] py-5 flex items-center justify-center gap-3 active:scale-[0.99] transition-transform relative overflow-hidden"
        >
          <BookIcon className="w-5 h-5 stroke-[var(--accent)]" />
          <span className="font-display text-2xl">{t('home.startQuiz')}</span>
          <ArrowIcon className="w-5 h-5 stroke-[var(--paper)]" />
        </button>
      </section>

      {/* RECENT */}
      <section className="px-5 mt-8">
        <Label num="V." text={t('home.recent')} />
        {userAttempts.length === 0 ? (
          <div className="text-sm text-[var(--ink-soft)] opacity-70 italic font-display">— {t('home.noRecent')}</div>
        ) : (
          <ul className="space-y-2">
            {userAttempts.slice(0, 3).map(a => {
              const pct = Math.round((a.score / a.total) * 100)
              return (
                <Card key={a.id} className="p-4 flex items-center gap-4" onClick={() => navigate(`/u/result/${a.id}`)}>
                  <div className="font-display text-3xl numerals w-12 text-center">
                    {pct}<span className="text-base opacity-50">%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase font-mono tracking-[0.18em] text-[var(--accent)]">{a.category ?? t('common.all')}</div>
                    <div className="font-display text-base">{a.score}/{a.total}</div>
                    <div className="text-xs text-[var(--ink-soft)] opacity-70 flex items-center gap-2 mt-0.5">
                      <ClockIcon className="w-3 h-3" />
                      <span className="font-mono">{relTime(a.startedAt, t)}</span>
                    </div>
                  </div>
                  <ArrowIcon className="w-4 h-4 stroke-[var(--ink-soft)]" />
                </Card>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatTile({ label, value, unit, icon, accent }: { label: string; value: number | string; unit?: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={clsx(
      'relative rounded-2xl p-4 border overflow-hidden',
      accent
        ? 'bg-[var(--accent)] border-transparent text-[var(--ink)]'
        : 'bg-[var(--paper-2)] border-[var(--hairline)]'
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase font-mono tracking-[0.18em] opacity-70">{label}</span>
        {icon && <span className="w-3.5 h-3.5 opacity-60">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-[40px] leading-none numerals">{value}</span>
        {unit && <span className="font-mono text-xs opacity-60">{unit}</span>}
      </div>
    </div>
  )
}

function Pill({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'shrink-0 px-3.5 py-1.5 rounded-full text-sm border transition-colors',
        active
          ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
          : 'bg-transparent border-[var(--hairline)] text-[var(--ink-soft)]'
      )}
    >
      {children}
    </button>
  )
}

function Label({ num, text }: { num: string; text: string }) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <span className="font-display text-[12px] tracking-[0.3em] text-[var(--ink-soft)] opacity-60">{num}</span>
      <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--ink-soft)]">{text}</span>
    </div>
  )
}
