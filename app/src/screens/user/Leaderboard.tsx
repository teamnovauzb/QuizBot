// Real-time global leaderboard backed by Supabase.
// No local/mock fallback — if the DB is unreachable we show empty state.
// Group scope was removed per UX feedback (single global ranking only).

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { fetchLeaderboard, type LeaderboardRow } from '../../lib/api2'
import { SUPABASE_ENABLED, supabase } from '../../lib/supabase'
import { SkeletonRow } from '../../components/Skeleton'
import clsx from 'clsx'

export default function Leaderboard() {
  const { t } = useTranslation()
  const tgUser = useStore(s => s.tgUser)
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [live, setLive] = useState(false)

  // Initial fetch — Supabase only. No local mock fallback.
  useEffect(() => {
    if (!SUPABASE_ENABLED) {
      setRows([])
      return
    }
    let cancel = false
    fetchLeaderboard({}).then(r => {
      if (cancel) return
      setRows(r.ok ? r.data : [])
    })
    return () => { cancel = true }
  }, [])

  // ───────── Realtime subscription: refresh whenever attempts table changes ─────────
  // Postgres LISTEN/NOTIFY via Supabase Realtime → debounced refetch keeps the
  // leaderboard live without polling. Cleans up on unmount.
  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        const r = await fetchLeaderboard({})
        if (r.ok) setRows(r.data)
      }, 600)
    }
    const channel = supabase
      .channel('leaderboard-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attempts' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'attempts' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, refresh)
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setLive(true)
        else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') setLive(false)
      })
    return () => {
      if (timer) clearTimeout(timer)
      supabase?.removeChannel(channel)
      setLive(false)
    }
  }, [])

  return (
    <div className="pb-32">
      <PageHeader
        eyebrow={t('app.tagline')}
        title={t('nav.leaderboard')}
        right={live ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] font-mono text-[9px] uppercase tracking-[0.18em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            LIVE
          </span>
        ) : null}
      />

      <div className="px-5 mt-4">
        {rows === null ? <SkeletonRow count={6} /> : rows.length === 0 ? (
          <div className="text-center py-10">
            <div className="font-display text-6xl text-[var(--ink-soft)] opacity-20 mb-2">∅</div>
            <div className="text-sm font-display italic text-[var(--ink-soft)]">{t('common.empty')}</div>
          </div>
        ) : (
          <ol className="space-y-2">
            {rows.map((r, i) => {
              const isMe = r.telegram_id === tgUser?.id
              return (
                <Card key={r.telegram_id} className={clsx('p-4 flex items-center gap-3', isMe && 'ring-1 ring-[var(--accent)]')}>
                  <div className={clsx(
                    'font-display text-3xl numerals w-10 text-center',
                    i === 0 && 'text-[var(--amber-warm,#E8B14A)]',
                    i === 1 && 'text-[var(--ink-soft)]',
                    i === 2 && 'text-[var(--coral-400,#FF6B47)]',
                    i > 2 && 'text-[var(--ink-soft)] opacity-40',
                  )}>{i + 1}</div>
                  <div className="w-10 h-10 rounded-full bg-[var(--ink)] text-[var(--paper)] grid place-items-center font-display text-lg shrink-0 overflow-hidden">
                    {r.photo_url ? <img src={r.photo_url} className="w-full h-full object-cover" alt="" /> : r.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base truncate">{r.name}{isMe && <span className="ml-1 text-xs font-mono text-[var(--accent)]">YOU</span>}</div>
                    <div className="text-xs font-mono text-[var(--ink-soft)]">{r.attempts} {t('home.completed').toLowerCase()} · {r.avg_pct}%</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl numerals">{r.total_correct}</div>
                    <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] opacity-60">pts</div>
                  </div>
                </Card>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
