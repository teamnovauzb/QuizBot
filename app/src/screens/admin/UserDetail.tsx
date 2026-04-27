import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { Shell, PageHeader, Card } from '../../components/Shell'
import { Heatmap } from '../../components/Heatmap'
import { Ring } from '../../components/Ring'
import { CATEGORIES } from '../../data/questions'
import { ArrowIcon, ClockIcon, SendIcon } from '../../components/Icons'
import { relTime, fmtMs } from '../../lib/time'

export default function UserDetail() {
  const { id } = useParams()
  const tid = parseInt(id ?? '0', 10)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const _users = useStore(s => s.users)
  const u = useMemo(() => _users.find(u => u.telegramId === tid), [_users, tid])
  const _attemptsRaw = useStore(s => s.attempts)
  const attempts = useMemo(() => _attemptsRaw.filter(a => a.userId === tid), [_attemptsRaw, tid])

  const heatmap = useMemo(() => {
    const days: { day: string; count: number }[] = []
    const map = new Map<string, number>()
    for (const a of attempts) {
      const k = new Date(a.startedAt).toISOString().slice(0, 10)
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    for (let i = 89; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      days.push({ day: d, count: map.get(d) ?? 0 })
    }
    return { days, max: Math.max(1, ...Array.from(map.values())) }
  }, [attempts])

  const catPct = useMemo(() => CATEGORIES.map(cat => {
    const ua = attempts.filter(a => a.category === cat)
    const total = ua.reduce((s, a) => s + a.total, 0)
    const correct = ua.reduce((s, a) => s + a.score, 0)
    const pct = total ? Math.round((correct / total) * 100) : 0
    return { cat, pct, count: ua.length }
  }).filter(x => x.count > 0), [attempts])

  if (!u) return <Shell><div className="flex-1 grid place-items-center font-display">—</div></Shell>

  return (
    <Shell className="overflow-y-auto">
      <PageHeader eyebrow={`@${u.username ?? u.telegramId}`} title={u.name} />

      <div className="px-5">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] grid place-items-center font-display text-xl">
            {u.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--accent)]">{t(`role.${u.role}`)}</div>
            <div className="font-display text-base">{u.name}</div>
            <div className="text-xs text-[var(--ink-soft)] font-mono">ID {u.telegramId} · {relTime(u.lastActive, t)}</div>
          </div>
          <a
            href={`https://t.me/${u.username ?? ''}`}
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 rounded-full border border-[var(--hairline)] grid place-items-center text-[var(--ink-soft)]"
          >
            <SendIcon className="w-4 h-4" />
          </a>
        </Card>
      </div>

      <div className="px-5 mt-4 grid grid-cols-3 gap-2">
        <Stat label={t('home.completed')} value={attempts.length} />
        <Stat label={t('home.accuracy')} value={attempts.length ? Math.round(attempts.reduce((s,a)=>s+a.score,0) / attempts.reduce((s,a)=>s+a.total,0) * 100) + '%' : '—'} />
        <Stat label={t('home.bestScore')} value={attempts.length ? Math.max(...attempts.map(a => Math.round(a.score / a.total * 100))) + '%' : '—'} />
      </div>

      {attempts.length > 0 && (
        <>
          <div className="px-5 mt-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)] mb-2">{t('profile.heatmap')}</div>
            <Card className="p-4 overflow-x-auto"><Heatmap days={heatmap.days} max={heatmap.max} /></Card>
          </div>
          {catPct.length > 0 && (
            <div className="px-5 mt-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)] mb-2">{t('profile.byCategory')}</div>
              <Card className="p-4">
                <div className="grid grid-cols-4 gap-3">
                  {catPct.map(c => <Ring key={c.cat} pct={c.pct} label={c.cat} />)}
                </div>
              </Card>
            </div>
          )}
          <div className="px-5 mt-5 pb-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)] mb-2">{t('home.recent')}</div>
            <ul className="space-y-2">
              {attempts.slice(0, 10).map(a => {
                const pct = Math.round((a.score / a.total) * 100)
                return (
                  <Card key={a.id} className="p-3 flex items-center gap-3">
                    <div className="font-display numerals text-2xl w-12 text-center">{pct}<span className="text-xs opacity-50">%</span></div>
                    <div className="flex-1">
                      <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--accent)]">{a.category ?? '—'}</div>
                      <div className="text-xs font-mono text-[var(--ink-soft)] flex items-center gap-1.5">
                        <ClockIcon className="w-3 h-3" />
                        {relTime(a.startedAt, t)} · {fmtMs(a.durationMs)}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </ul>
          </div>
        </>
      )}

      <div className="px-5 pb-10">
        <button onClick={() => navigate(-1)} className="w-full rounded-2xl border border-[var(--hairline)] py-3 text-sm font-mono uppercase tracking-[0.18em] text-[var(--ink-soft)] flex items-center justify-center gap-2">
          <ArrowIcon className="w-3 h-3 -scale-x-100" /> {t('common.back')}
        </button>
      </div>
    </Shell>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)] p-3">
      <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] opacity-70 mb-1">{label}</div>
      <div className="font-display text-2xl numerals">{value}</div>
    </div>
  )
}
