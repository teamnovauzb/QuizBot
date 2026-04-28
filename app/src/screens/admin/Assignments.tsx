import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { PlusIcon, XIcon, ClockIcon, TrashIcon, EditIcon } from '../../components/Icons'
import {
  fetchAssignments, createAssignment, deleteAssignment, updateAssignment,
  type AssignmentRow,
} from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'
import { haptic, confirmDialog } from '../../lib/telegram'
import clsx from 'clsx'

export default function AdminAssignments() {
  const { t } = useTranslation()
  const tgUser = useStore(s => s.tgUser)
  const groups = useStore(s => s.groups)
  const questions = useStore(s => s.questions)

  const myGroup = groups.find(g => g.adminId === tgUser?.id)

  const [list, setList] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AssignmentRow | null>(null)

  async function reload() {
    setLoading(true)
    if (SUPABASE_ENABLED) {
      const r = await fetchAssignments()
      if (r.ok) setList(r.data)
    } else {
      setList([])
    }
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  return (
    <div className="pb-32">
      <PageHeader
        eyebrow={myGroup?.name ?? t('common.all')}
        title={t('nav.assignments')}
        right={
          <button onClick={() => { setCreating(true); haptic('medium') }} className="rounded-full bg-[var(--ink)] text-[var(--paper)] w-12 h-12 grid place-items-center">
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />
      <div className="px-5 mt-2 space-y-2">
        {loading ? (
          <div className="text-sm font-display italic text-[var(--ink-soft)]">{t('common.loading')}</div>
        ) : list.length === 0 ? (
          <div className="text-center py-10">
            <div className="font-display text-6xl text-[var(--ink-soft)] opacity-20 mb-2">∅</div>
            <div className="text-sm font-display italic text-[var(--ink-soft)]">{t('assignments.empty')}</div>
          </div>
        ) : list.map(a => (
          <Card key={a.id} className="p-4">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <div className="font-display text-lg flex-1 truncate">{a.title}</div>
              <button onClick={() => setEditing(a)} className="text-[var(--ink-soft)] p-1">
                <EditIcon className="w-4 h-4" />
              </button>
              <button onClick={async () => {
                if (!await confirmDialog(t('admin.confirmDelete'))) return
                await deleteAssignment(a.id); haptic('heavy'); toast.success(t('admin.deletedToast')); reload()
              }} className="text-[var(--ink-soft)] p-1">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            {a.description && <div className="text-sm text-[var(--ink-soft)] mb-2">{a.description}</div>}
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-soft)]">
              <ClockIcon className="w-3 h-3" />
              <span>{a.time_per_q}s/q · {a.question_ids.length} {t('home.questions')}</span>
              {a.deadline && <span className="ml-auto">{new Date(a.deadline).toLocaleDateString()}</span>}
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {(creating || editing) && (
          <AssignmentSheet
            initial={editing}
            onClose={() => { setCreating(false); setEditing(null) }}
            groupId={myGroup?.id}
            availableQuestions={questions}
            onSave={async (data) => {
              if (editing) {
                await updateAssignment(editing.id, data)
                toast.success(t('admin.savedToast'))
              } else {
                await createAssignment(data)
                toast.success(t('admin.createdToast'))
              }
              setCreating(false); setEditing(null); reload()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function AssignmentSheet({ initial, onClose, onSave, groupId, availableQuestions }: {
  initial: AssignmentRow | null
  onClose: () => void
  groupId?: string
  availableQuestions: { id: string; question: string; category: string }[]
  onSave: (data: { title: string; description: string | null; group_id: string | null; question_ids: string[]; time_per_q: number; deadline: string | null }) => void
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [time, setTime] = useState(initial?.time_per_q ?? 30)
  const [deadline, setDeadline] = useState<string>(initial?.deadline ? initial.deadline.slice(0, 10) : '')
  const [picked, setPicked] = useState<Set<string>>(new Set(initial?.question_ids ?? []))
  const [search, setSearch] = useState('')

  const filtered = search
    ? availableQuestions.filter(q => q.question.toLowerCase().includes(search.toLowerCase()))
    : availableQuestions

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="w-full max-h-[92dvh] bg-[var(--paper)] rounded-t-3xl pb-[max(env(safe-area-inset-bottom),20px)] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="pt-3"><div className="w-10 h-1 rounded-full bg-[var(--hairline)] mx-auto" /></div>
        <div className="px-5 py-3 flex items-center justify-between">
          <h3 className="font-display text-2xl">{initial ? t('admin.editAssignment') : t('admin.newAssignment')}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full border border-[var(--hairline)] grid place-items-center"><XIcon className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('admin.assignmentTitle')}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)]" />
          <textarea value={description ?? ''} onChange={e => setDescription(e.target.value)} placeholder={t('admin.assignmentDesc')} rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)] text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-1">{t('home.chooseTime')}</div>
              <input type="number" min={10} max={300} value={time} onChange={e => setTime(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)]" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-1">{t('admin.deadline')}</div>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)]" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)]">
                {t('admin.pickQuestions', { n: picked.size })}
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search')}
                className="w-44 px-2 py-1 rounded-lg border border-[var(--hairline)] bg-[var(--paper-2)] text-xs" />
            </div>
            <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto">
              {filtered.slice(0, 200).map(q => (
                <button key={q.id} type="button" onClick={() => {
                  const next = new Set(picked)
                  next.has(q.id) ? next.delete(q.id) : next.add(q.id)
                  setPicked(next)
                }} className={clsx(
                  'w-full text-left p-2.5 rounded-xl border text-sm flex items-start gap-2',
                  picked.has(q.id) ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]' : 'border-[var(--hairline)]',
                )}>
                  <span className="font-mono text-[10px] mt-0.5 shrink-0">{q.category}</span>
                  <span className="line-clamp-2">{q.question}</span>
                </button>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-5 pt-3">
          <button
            onClick={() => onSave({
              title,
              description: description || null,
              group_id: initial?.group_id ?? groupId ?? null,
              question_ids: Array.from(picked),
              time_per_q: time,
              deadline: deadline ? new Date(deadline).toISOString() : null,
            })}
            disabled={!title || picked.size === 0}
            className="w-full rounded-2xl py-3 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50 font-display text-base"
          >
            {initial ? t('admin.save') : t('admin.create')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
