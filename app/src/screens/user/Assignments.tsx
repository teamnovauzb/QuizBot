import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAssignments, type AssignmentRow } from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'
import { Card, PageHeader } from '../../components/Shell'
import { SkeletonRow } from '../../components/Skeleton'
import { ClockIcon, ArrowIcon } from '../../components/Icons'

export default function Assignments() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [list, setList] = useState<AssignmentRow[] | null>(null)

  useEffect(() => {
    if (!SUPABASE_ENABLED) { setList([]); return }
    fetchAssignments().then(r => setList(r.ok ? r.data : []))
  }, [])

  return (
    <div className="pb-32">
      <PageHeader eyebrow={t('app.tagline')} title={t('nav.assignments')} />
      <div className="px-5 mt-3">
        {list === null ? <SkeletonRow count={3} /> : list.length === 0 ? (
          <div className="text-center py-10">
            <div className="font-display text-6xl text-[var(--ink-soft)] opacity-20 mb-2">∅</div>
            <div className="text-sm font-display italic text-[var(--ink-soft)]">{t('assignments.empty')}</div>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map(a => {
              const overdue = a.deadline && new Date(a.deadline) < new Date()
              return (
                <Card key={a.id} className="p-4" onClick={() => navigate(`/u/quiz?ids=${a.question_ids.join(',')}&time=${a.time_per_q}&assignment=${a.id}`)}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <div className="font-display text-xl">{a.title}</div>
                    {a.deadline && (
                      <span className={'text-[10px] uppercase font-mono tracking-[0.18em] ' + (overdue ? 'text-[#F87171]' : 'text-[var(--ink-soft)]')}>
                        {new Date(a.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  {a.description && <div className="text-sm text-[var(--ink-soft)] mb-2">{a.description}</div>}
                  <div className="flex items-center gap-3 text-xs font-mono text-[var(--ink-soft)]">
                    <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" />{a.time_per_q}s/q</span>
                    <span>·</span>
                    <span>{a.question_ids.length} {t('home.questions')}</span>
                    <ArrowIcon className="w-4 h-4 ml-auto" />
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
