import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { QUESTIONS } from '../../data/questions'
import { Heatmap } from '../../components/Heatmap'

export default function Analytics() {
  const { t } = useTranslation()
  const attempts = useStore(s => s.attempts)
  const users = useStore(s => s.users)
  const questions = useStore(s => s.questions)

  // Top categories by attempt count
  const catStats = useMemo(() => {
    const m = new Map<string, { count: number; correct: number; total: number }>()
    for (const a of attempts) {
      const c = a.category ?? 'Umumiy'
      const cur = m.get(c) ?? { count: 0, correct: 0, total: 0 }
      m.set(c, { count: cur.count + 1, correct: cur.correct + a.score, total: cur.total + a.total })
    }
    return Array.from(m.entries())
      .map(([cat, s]) => ({ cat, count: s.count, accuracy: s.total ? Math.round(s.correct / s.total * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
  }, [attempts])

  // Hardest questions (most failures)
  const hardest = useMemo(() => {
    const m = new Map<string, { wrong: number; total: number }>()
    for (const a of attempts) {
      for (const ans of a.answers) {
        const cur = m.get(ans.questionId) ?? { wrong: 0, total: 0 }
        m.set(ans.questionId, { wrong: cur.wrong + (ans.correct ? 0 : 1), total: cur.total + 1 })
      }
    }
    return Array.from(m.entries())
      .filter(([_, s]) => s.total >= 3)
      .map(([id, s]) => ({ id, fail_pct: Math.round(s.wrong / s.total * 100), total: s.total }))
      .sort((a, b) => b.fail_pct - a.fail_pct)
      .slice(0, 8)
  }, [attempts])

  // 30-day activity heatmap
  const heatmap = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of attempts) {
      const k = new Date(a.startedAt).toISOString().slice(0, 10)
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    const days: { day: string; count: number }[] = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      days.push({ day: d, count: m.get(d) ?? 0 })
    }
    return { days, max: Math.max(1, ...Array.from(m.values())) }
  }, [attempts])

  // Weekly active users (last 7 days)
  const weeklyActive = useMemo(() => {
    const since = Date.now() - 7 * 86400000
    return new Set(attempts.filter(a => a.startedAt >= since).map(a => a.userId)).size
  }, [attempts])

  // Avg score
  const avgScore = useMemo(() => {
    if (!attempts.length) return 0
    const totalCorrect = attempts.reduce((s, a) => s + a.score, 0)
    const total = attempts.reduce((s, a) => s + a.total, 0)
    return total ? Math.round(totalCorrect / total * 100) : 0
  }, [attempts])

  return (
    <div className="pb-32">
      <PageHeader eyebrow={t('super.title')} title={t('nav.analytics')} />

      <div className="px-5 mt-2 grid grid-cols-2 gap-3">
        <Stat label="WAU" value={weeklyActive} accent />
        <Stat label="MAU" value={users.length} />
        <Stat label="Avg score" value={avgScore + '%'} />
        <Stat label="Total attempts" value={attempts.length} />
      </div>

      <div className="px-5 mt-7">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)] mb-3">Activity · 90d</div>
        <Card className="p-4 overflow-x-auto"><Heatmap days={heatmap.days} max={heatmap.max} /></Card>
      </div>

      <div className="px-5 mt-7">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)] mb-3">Categories</div>
        <Card className="p-4">
          {catStats.length === 0 ? <div className="text-sm font-display italic text-[var(--ink-soft)]">{t('common.empty')}</div> : (
            <div className="space-y-2.5">
              {catStats.map(c => (
                <div key={c.cat}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-display text-base">{c.cat}</span>
                    <span className="font-mono text-xs text-[var(--ink-soft)]">{c.count} · {c.accuracy}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--paper)] overflow-hidden">
                    <div className="h-full bg-[var(--accent)]" style={{ width: `${c.accuracy}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="px-5 mt-7">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)] mb-3">Hardest questions</div>
        <ul className="space-y-2">
          {hardest.length === 0 ? (
            <Card className="p-4 text-sm font-display italic text-[var(--ink-soft)]">— {t('common.empty')}</Card>
          ) : hardest.map((h, i) => {
            const q = questions.find(qq => qq.id === h.id) ?? QUESTIONS.find(qq => qq.id === h.id)
            return (
              <Card key={h.id} className="p-4 flex items-center gap-3">
                <div className="font-display numerals text-2xl w-10 text-center text-[#F87171]">{h.fail_pct}<span className="text-xs opacity-50">%</span></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)]">#{i + 1} · {q?.category ?? '—'}</div>
                  <div className="font-display text-sm line-clamp-2">{q?.question ?? h.id}</div>
                </div>
              </Card>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={'rounded-2xl p-4 border ' + (accent ? 'bg-[var(--accent)] text-[var(--ink)] border-transparent' : 'bg-[var(--paper-2)] border-[var(--hairline)]')}>
      <div className="text-[10px] uppercase font-mono tracking-[0.18em] opacity-70 mb-1">{label}</div>
      <div className="font-display font-bold text-[26px] leading-none tabular">{value}</div>
    </div>
  )
}
