// Test setup screen — pick count + time-per-question + category, then start.
// Lives at /u/test, sits between Home and Leaderboard in the tab bar.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader, Card } from '../../components/Shell'
import { ArrowIcon, ClockIcon, QuestionIcon, BookIcon } from '../../components/Icons'
import { CATEGORIES } from '../../data/questions'
import { fetchBotConfig } from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'
import { haptic } from '../../lib/telegram'
import clsx from 'clsx'

const COUNTS = [10, 20, 30, 50] as const
const TIMES = [15, 30, 45, 60] as const

export default function Test() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [count, setCount] = useState<number>(10)
  const [time, setTime] = useState<number>(30)
  const [cat, setCat] = useState<string | null>(null)

  // Pull defaults from bot_config the first time the screen mounts.
  // Subsequent visits keep whatever the user picked locally during this session.
  useEffect(() => {
    if (!SUPABASE_ENABLED) return
    fetchBotConfig().then(r => {
      if (!r.ok) return
      const c = Number(r.data.default_quiz_count)
      const tm = Number(r.data.default_time_per_q)
      if (c > 0) setCount(c)
      if (tm > 0) setTime(tm)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cats = useMemo(() => CATEGORIES, [])

  function start() {
    haptic('medium')
    const q = new URLSearchParams()
    q.set('count', String(count))
    q.set('time', String(time))
    if (cat) q.set('cat', cat)
    navigate(`/u/quiz?${q.toString()}`)
  }

  return (
    <div className="pb-32">
      <PageHeader
        eyebrow={t('app.tagline')}
        title={t('test.title')}
      />

      {/* Count */}
      <section className="px-5 mt-2 fade-up">
        <SectionLabel icon={<QuestionIcon className="w-3.5 h-3.5 stroke-[var(--accent)]" />}>
          {t('test.count')}
        </SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {COUNTS.map(n => (
            <Chip key={n} active={count === n} onClick={() => { haptic('light'); setCount(n) }}>
              <div className="font-display font-bold text-lg leading-none">{n}</div>
              <div className="text-[9px] uppercase tracking-[0.18em] font-mono opacity-70 mt-1">
                {t('home.questions')}
              </div>
            </Chip>
          ))}
        </div>
      </section>

      {/* Time per question */}
      <section className="px-5 mt-5 fade-up" style={{ animationDelay: '0.05s' }}>
        <SectionLabel icon={<ClockIcon className="w-3.5 h-3.5 stroke-[var(--accent)]" />}>
          {t('test.timePerQ')}
        </SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {TIMES.map(s => (
            <Chip key={s} active={time === s} onClick={() => { haptic('light'); setTime(s) }}>
              <div className="font-display font-bold text-lg leading-none">{s}<span className="text-xs opacity-60">s</span></div>
              <div className="text-[9px] uppercase tracking-[0.18em] font-mono opacity-70 mt-1">
                {t('home.seconds')}
              </div>
            </Chip>
          ))}
        </div>
      </section>

      {/* Category */}
      <section className="px-5 mt-5 fade-up" style={{ animationDelay: '0.1s' }}>
        <SectionLabel icon={<BookIcon className="w-3.5 h-3.5 stroke-[var(--accent)]" />}>
          {t('test.category')}
        </SectionLabel>
        <div className="flex flex-wrap gap-2">
          <PillChip active={cat === null} onClick={() => { haptic('light'); setCat(null) }}>
            {t('common.all')}
          </PillChip>
          {cats.map(c => (
            <PillChip key={c} active={cat === c} onClick={() => { haptic('light'); setCat(c) }}>
              {t(`cat.${c}`, c)}
            </PillChip>
          ))}
        </div>
      </section>

      {/* Summary card */}
      <section className="px-5 mt-6 fade-up" style={{ animationDelay: '0.15s' }}>
        <Card className="p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-[var(--text-muted)] mb-1">
              {t('test.summary')}
            </div>
            <div className="font-display font-semibold text-base">
              {count} · {time}s {cat && <span className="text-[var(--accent)]">· {t(`cat.${cat}`, cat)}</span>}
            </div>
          </div>
        </Card>
      </section>

      {/* PRIMARY CTA */}
      <section className="px-5 mt-4 fade-up" style={{ animationDelay: '0.2s' }}>
        <button
          onClick={start}
          className="w-full rounded-3xl bg-[var(--accent)] text-[var(--bg)] p-5 flex items-center gap-3 active:scale-[0.99] shadow-[0_8px_32px_-8px_var(--accent-glow)]"
        >
          <div className="text-left flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] font-mono opacity-70">
              {t('home.quickStart')}
            </div>
            <div className="font-display font-bold text-2xl leading-tight mt-0.5">
              {t('home.startQuiz')}
            </div>
            <div className="text-xs opacity-80 mt-1 font-mono">
              {count} · {time}s {cat ? `· ${t(`cat.${cat}`, cat)}` : `· ${t('common.all')}`}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-[var(--bg)]/15 grid place-items-center">
            <ArrowIcon className="w-5 h-5 stroke-current" />
          </div>
        </button>
      </section>
    </div>
  )
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-[10px] uppercase tracking-[0.22em] font-mono text-[var(--text-muted)]">
        {children}
      </span>
    </div>
  )
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-2xl py-3 px-2 border text-center transition-colors active:scale-[0.99]',
        active
          ? 'bg-[var(--accent)] text-[var(--bg)] border-transparent shadow-[0_4px_16px_-4px_var(--accent-glow)]'
          : 'glass border-[var(--hairline-strong)] text-[var(--text)]',
      )}
    >
      {children}
    </button>
  )
}

function PillChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-full px-3 py-1.5 text-xs font-display font-medium border transition-colors active:scale-[0.97]',
        active
          ? 'bg-[var(--accent)] text-[var(--bg)] border-transparent'
          : 'glass border-[var(--hairline-strong)] text-[var(--text-muted)]',
      )}
    >
      {children}
    </button>
  )
}
