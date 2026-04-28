import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { fetchLeaderboard, type LeaderboardRow } from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'
import { SkeletonRow } from '../../components/Skeleton'
import clsx from 'clsx'

export default function Leaderboard() {
  const { t } = useTranslation()
  const tgUser = useStore(s => s.tgUser)
  const me = useStore(s => s.users.find(u => u.telegramId === tgUser?.id))
  const [scope, setScope] = useState<'global' | 'group'>('global')
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)

  // local fallback (when Supabase off)
  const _allUsers = useStore(s => s.users)
  const localUsers = useMemo(() => _allUsers.filter(u => u.role === 'user' && !u.blocked), [_allUsers])
  const attempts = useStore(s => s.attempts)

  useEffect(() => {
    let cancel = false
    async function load() {
      if (SUPABASE_ENABLED) {
        const r = await fetchLeaderboard({ groupId: scope === 'group' ? me?.groupId : undefined })
        if (!cancel && r.ok) setRows(r.data)
        else if (!cancel) setRows([])
      } else {
        const filtered = scope === 'group' && me?.groupId ? localUsers.filter(u => u.groupId === me.groupId) : localUsers
        const board: LeaderboardRow[] = filtered.map(u => {
          const ua = attempts.filter(a => a.userId === u.telegramId)
          const total_correct = ua.reduce((s, a) => s + a.score, 0)
          const total = ua.reduce((s, a) => s + a.total, 0)
          const avg_pct = total ? Math.round((total_correct / total) * 100) : 0
          return {
            telegram_id: u.telegramId,
            name: u.name,
            username: u.username ?? null,
            photo_url: null,
            group_id: u.groupId ?? null,
            attempts: ua.length,
            total_correct,
            avg_pct,
            score_index: total_correct * 10 + ua.length,
          }
        })
        board.sort((a, b) => b.score_index - a.score_index)
        if (!cancel) setRows(board)
      }
    }
    load()
    return () => { cancel = true }
  }, [scope, me?.groupId])

  return (
    <div className="pb-28">
      <PageHeader eyebrow={t('app.tagline')} title={t('nav.leaderboard')} />

      <div className="px-5 mt-2 inline-flex">
        <div className="inline-flex bg-[var(--paper-2)] rounded-full border border-[var(--hairline)] p-0.5">
          {(['global', 'group'] as const).map(k => (
            <button key={k} onClick={() => setScope(k)} className={clsx(
              'px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-[0.18em]',
              scope === k ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-soft)]',
              k === 'group' && !me?.groupId && 'opacity-40',
            )} disabled={k === 'group' && !me?.groupId}>
              {t('leaderboard.' + k)}
            </button>
          ))}
        </div>
      </div>

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
