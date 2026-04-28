// Broadcast HISTORY view (separate from the composer at /super/broadcast).
// Lists previously sent broadcasts with delivered/failed/blocked counts.

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Card } from '../../components/Shell'
import { fetchBroadcasts } from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'
import { SkeletonRow } from '../../components/Skeleton'
import { CheckIcon, XIcon, SendIcon, PlusIcon } from '../../components/Icons'
import { relTime } from '../../lib/time'

type Row = Awaited<ReturnType<typeof fetchBroadcasts>>

export default function BroadcastHistory() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [list, setList] = useState<Row | null>(null)

  useEffect(() => {
    if (!SUPABASE_ENABLED) { setList({ ok: true, data: [] } as Row); return }
    fetchBroadcasts(50).then(r => setList(r))
  }, [])

  const data = list?.ok ? list.data : []

  return (
    <div className="pb-32">
      <PageHeader
        eyebrow={`${data.length} ${t('broadcasts.title').toLowerCase()}`}
        title={t('broadcasts.title')}
        right={
          <button onClick={() => navigate('/super/broadcast')} className="rounded-full bg-[var(--ink)] text-[var(--paper)] w-12 h-12 grid place-items-center">
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-5 mt-2 space-y-2">
        {list === null ? <SkeletonRow count={3} /> :
          data.length === 0 ? (
          <div className="text-center py-10">
            <div className="font-display text-6xl text-[var(--ink-soft)] opacity-20 mb-2">∅</div>
            <div className="text-sm font-display italic text-[var(--ink-soft)]">{t('broadcasts.empty')}</div>
          </div>
        ) : data.map(b => {
          const total = b.sent + b.failed + b.blocked
          const successPct = total ? Math.round((b.sent / total) * 100) : 0
          return (
            <Card key={b.id} className="p-4">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-base truncate">{b.title}</div>
                  <div className="text-xs text-[var(--text-muted)] line-clamp-2 mt-0.5">{b.body}</div>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] shrink-0">{b.recipients}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--hairline)] flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-[var(--accent)]">
                  <CheckIcon className="w-3 h-3" />
                  {b.sent}
                </span>
                {b.failed > 0 && (
                  <span className="flex items-center gap-1 text-[#F87171]">
                    <XIcon className="w-3 h-3" />
                    {b.failed}
                  </span>
                )}
                {b.blocked > 0 && (
                  <span className="text-[var(--text-muted)] font-mono">⛔ {b.blocked}</span>
                )}
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] flex items-center gap-1">
                  <SendIcon className="w-3 h-3" />
                  {successPct}%
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] opacity-60">
                  {relTime(new Date(b.sent_at).getTime(), t)}
                </span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
