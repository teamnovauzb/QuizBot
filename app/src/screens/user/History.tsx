import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { ArrowIcon, ClockIcon } from '../../components/Icons'
import { fmtMs, relTime } from '../../lib/time'

export default function History() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tgUser = useStore(s => s.tgUser)
  const _attemptsRaw = useStore(s => s.attempts)
  const attempts = useMemo(() => _attemptsRaw.filter(a => a.userId === tgUser?.id), [_attemptsRaw, tgUser?.id])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof attempts>()
    for (const a of attempts) {
      const d = new Date(a.startedAt)
      const key = d.toISOString().slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(a)
      map.set(key, arr)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [attempts])

  return (
    <div className="pb-28">
      <PageHeader eyebrow={t('app.tagline')} title={t('history.title')} />

      {grouped.length === 0 ? (
        <div className="px-5 mt-10 text-center">
          <div className="font-display text-7xl text-[var(--ink-soft)] opacity-20 mb-3">∅</div>
          <div className="text-sm text-[var(--ink-soft)] font-display italic">{t('history.empty')}</div>
        </div>
      ) : (
        <div className="px-5 space-y-6">
          {grouped.map(([date, list]) => (
            <section key={date}>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)] opacity-70">
                  {new Date(date).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                </span>
                <div className="h-px flex-1 bg-[var(--hairline)]" />
                <span className="font-mono text-[10px] text-[var(--ink-soft)] opacity-50">{list.length}</span>
              </div>
              <ul className="space-y-2">
                {list.map(a => {
                  const pct = Math.round((a.score / a.total) * 100)
                  return (
                    <Card key={a.id} className="p-4 flex items-center gap-4" onClick={() => navigate(`/u/result/${a.id}`)}>
                      <div className="font-display numerals text-[36px] leading-none w-14 text-center">
                        <span className={pct >= 70 ? 'text-[var(--ink)]' : pct >= 40 ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]'}>
                          {pct}
                        </span>
                        <span className="text-sm opacity-50">%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] uppercase font-mono tracking-[0.18em] text-[var(--accent)]">{a.category ?? t('common.all')}</div>
                        <div className="font-display text-base">{a.score}/{a.total}</div>
                        <div className="text-xs text-[var(--ink-soft)] opacity-70 flex items-center gap-2 mt-0.5">
                          <ClockIcon className="w-3 h-3" />
                          <span className="font-mono">{relTime(a.startedAt, t)} · {fmtMs(a.durationMs)}</span>
                        </div>
                      </div>
                      <ArrowIcon className="w-4 h-4 stroke-[var(--ink-soft)]" />
                    </Card>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
