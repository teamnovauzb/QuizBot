import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { SearchIcon } from '../../components/Icons'
import { relTime } from '../../lib/time'
import { fetchAudit } from '../../lib/api'
import { SUPABASE_ENABLED } from '../../lib/supabase'
import { SkeletonRow } from '../../components/Skeleton'

export default function Audit() {
  const { t } = useTranslation()
  const localAudit = useStore(s => s.audit)
  const users = useStore(s => s.users)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'all' | 'user' | 'admin' | 'superadmin'>('all')
  const [dbAudit, setDbAudit] = useState<typeof localAudit | null>(null)

  // Pull from DB on mount, fall back to local if disabled or empty
  useEffect(() => {
    if (!SUPABASE_ENABLED) { setDbAudit([]); return }
    fetchAudit(200).then(r => setDbAudit(r.ok ? r.data : []))
  }, [])

  // Merge: DB first (canonical), then local-only entries that aren't in DB yet
  const merged = useMemo(() => {
    if (dbAudit === null) return null
    const byId = new Set(dbAudit.map(e => e.id))
    return [...dbAudit, ...localAudit.filter(e => !byId.has(e.id))]
      .sort((a, b) => b.ts - a.ts)
  }, [dbAudit, localAudit])

  const list = useMemo(() => {
    if (!merged) return null
    return merged.filter(e => {
      if (role !== 'all' && e.actorRole !== role) return false
      if (search) {
        const u = users.find(u => u.telegramId === e.actor)
        const hay = (e.action + ' ' + (e.target ?? '') + ' ' + (u?.name ?? '') + ' ' + (u?.username ?? '')).toLowerCase()
        if (!hay.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [merged, search, role, users])

  return (
    <div className="pb-32">
      <PageHeader eyebrow={`${merged?.length ?? 0} entries`} title={t('super.auditLog')} />
      <div className="px-5 mt-2">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-[var(--hairline)] bg-[var(--paper-2)]">
          <SearchIcon className="w-4 h-4 stroke-[var(--ink-soft)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search')} className="flex-1 bg-transparent text-sm" />
        </div>
      </div>
      <div className="px-5 mt-3 inline-flex">
        <div className="inline-flex bg-[var(--paper-2)] rounded-full border border-[var(--hairline)] p-0.5">
          {(['all','user','admin','superadmin'] as const).map(k => (
            <button key={k} onClick={() => setRole(k)} className={
              'px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-[0.18em] ' +
              (role === k ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-soft)]')
            }>{k}</button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4">
        {list === null ? <SkeletonRow count={6} /> :
          list.length === 0 ? (
          <div className="text-center py-10">
            <div className="font-display text-6xl text-[var(--ink-soft)] opacity-20 mb-2">∅</div>
            <div className="text-sm font-display italic text-[var(--ink-soft)]">{t('common.empty')}</div>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {list.map(e => {
              const u = users.find(u => u.telegramId === e.actor)
              return (
                <Card key={e.id} className="p-3 flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] shrink-0">{e.actorRole}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm truncate">{e.action}{e.target && <span className="text-[var(--ink-soft)] ml-1">→ {e.target}</span>}</div>
                    <div className="text-[10px] font-mono text-[var(--ink-soft)] opacity-60">
                      {u?.name ?? e.actor} · {relTime(e.ts, t)}
                    </div>
                  </div>
                </Card>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
