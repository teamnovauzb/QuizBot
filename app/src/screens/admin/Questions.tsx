import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, XIcon, CheckIcon, BookIcon } from '../../components/Icons'
import { CATEGORIES, type Question, type Difficulty } from '../../data/questions'
import clsx from 'clsx'
import { haptic, confirmDialog } from '../../lib/telegram'
import { uploadQuestionImage } from '../../lib/storage'

export default function Questions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const questions = useStore(s => s.questions)
  const addQ = useStore(s => s.addQuestion)
  const updateQ = useStore(s => s.updateQuestion)
  const removeQ = useStore(s => s.removeQuestion)

  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Question | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = questions.filter(q => {
    if (filter !== 'all' && q.category !== filter) return false
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="pb-28">
      <PageHeader
        eyebrow={`${questions.length} ${t('home.questions')}`}
        title={t('nav.questions')}
        right={
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/admin/import')}
              className="rounded-full border border-[var(--hairline)] w-12 h-12 grid place-items-center text-[var(--ink-soft)]"
              aria-label="bulk import"
            >
              <BookIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => { haptic('medium'); setCreating(true) }}
              className="rounded-full bg-[var(--ink)] text-[var(--paper)] w-12 h-12 grid place-items-center"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <div className="px-5 mt-2">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-[var(--hairline)] bg-[var(--paper-2)]">
          <SearchIcon className="w-4 h-4 stroke-[var(--ink-soft)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="flex-1 bg-transparent text-sm placeholder:text-[var(--ink-soft)] placeholder:opacity-60"
          />
        </div>
      </div>

      <div className="mt-3 px-5">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>{t('common.all')}</FilterPill>
          {CATEGORIES.map(c => (
            <FilterPill key={c} active={filter === c} onClick={() => setFilter(c)}>{t(`cat.${c}`, { defaultValue: c })}</FilterPill>
          ))}
        </div>
      </div>

      <div className="px-5 mt-3 space-y-2">
        {filtered.map((q, i) => (
          <Card key={q.id} className="p-4 paper-rise" >
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-display numerals text-2xl text-[var(--ink-soft)] opacity-30">
                {(i + 1).toString().padStart(3, '0')}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">{q.category}</span>
              {q.difficulty && (
                <span className={clsx(
                  'font-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded',
                  q.difficulty === 'easy' && 'bg-[var(--accent-soft)] text-[var(--accent)]',
                  q.difficulty === 'medium' && 'bg-[var(--paper-2)] text-[var(--ink-soft)] border border-[var(--hairline)]',
                  q.difficulty === 'hard' && 'bg-[#F87171]/15 text-[#F87171]',
                )}>{t(`difficulty.${q.difficulty}`)}</span>
              )}
            </div>
            {q.imageUrl && (
              <img src={q.imageUrl} alt="" className="w-full h-32 object-cover rounded-xl mb-2" />
            )}
            <div className="font-display text-base leading-snug pr-2">{q.question}</div>
            <div className="mt-2 text-xs font-mono text-[var(--ink-soft)] opacity-70 flex items-center gap-1">
              <CheckIcon className="w-3 h-3 stroke-[var(--accent)]" />
              <span className="truncate">{q.options[q.correctIndex]}</span>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--hairline)]">
              <button
                onClick={() => setEditing(q)}
                className="flex-1 rounded-xl py-2 border border-[var(--hairline)] text-sm flex items-center justify-center gap-1.5"
              >
                <EditIcon className="w-3.5 h-3.5" /> {t('common.edit')}
              </button>
              <button
                onClick={async () => {
                  if (!await confirmDialog(t('admin.confirmDelete'))) return
                  removeQ(q.id); haptic('heavy')
                  toast.success(t('admin.deletedToast'))
                }}
                className="rounded-xl py-2 px-3 border border-[var(--hairline)] text-[var(--ink-soft)]"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {(editing || creating) && (
          <QuestionEditor
            initial={editing}
            onClose={() => { setEditing(null); setCreating(false) }}
            onSave={(data) => {
              if (editing) {
                updateQ(editing.id, data)
                toast.success(t('admin.savedToast'))
              } else {
                addQ({
                  question: data.question ?? '',
                  options: data.options ?? ['', '', '', ''],
                  correctIndex: data.correctIndex ?? 0,
                  category: data.category ?? 'Umumiy',
                  explanation: data.explanation,
                  difficulty: data.difficulty,
                  imageUrl: data.imageUrl,
                })
                toast.success(t('admin.createdToast'))
              }
              setEditing(null); setCreating(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterPill({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'shrink-0 px-3.5 py-1.5 rounded-full text-sm border transition-colors',
        active ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]' : 'bg-transparent border-[var(--hairline)] text-[var(--ink-soft)]'
      )}
    >{children}</button>
  )
}

function QuestionEditor({ initial, onClose, onSave }: {
  initial: Question | null
  onClose: () => void
  onSave: (q: Partial<Question>) => void
}) {
  const { t } = useTranslation()
  const [question, setQuestion] = useState(initial?.question ?? '')
  const [options, setOptions] = useState<string[]>(initial?.options ?? ['', '', '', ''])
  const [correctIndex, setCorrectIndex] = useState<number>(initial?.correctIndex ?? 0)
  const [category, setCategory] = useState<string>(initial?.category ?? 'Umumiy')
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'medium')
  const [explanation, setExplanation] = useState<string>(initial?.explanation ?? '')
  const [imageUrl, setImageUrl] = useState<string>(initial?.imageUrl ?? '')
  const [uploading, setUploading] = useState(false)

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const r = await uploadQuestionImage(file)
    setUploading(false)
    if (r.ok) {
      setImageUrl(r.url)
      toast.success(t('admin.imageUploaded'))
    } else {
      toast.error(`${t('admin.imageFailed')}: ${r.error}`)
    }
    e.target.value = ''
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-end bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="w-full max-h-[92dvh] bg-[var(--paper)] rounded-t-3xl pb-[max(env(safe-area-inset-bottom),20px)] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[var(--hairline)] mx-auto" />
        </div>
        <div className="px-5 pb-3 flex items-center justify-between">
          <h3 className="font-display text-2xl">{initial ? t('admin.editQuestion') : t('admin.addQuestion')}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full border border-[var(--hairline)] grid place-items-center">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 space-y-4">
          <Field label={t('admin.questionText')}>
            <textarea
              value={question} onChange={e => setQuestion(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)] text-base resize-none"
            />
          </Field>
          <Field label={t('admin.image')}>
            {imageUrl ? (
              <div className="relative">
                <img src={imageUrl} alt="" className="w-full h-40 object-cover rounded-xl" />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white grid place-items-center"
                  type="button"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="block w-full px-3 py-3 rounded-xl border border-dashed border-[var(--hairline-strong)] bg-[var(--paper-2)] text-center text-sm text-[var(--ink-soft)] cursor-pointer">
                {uploading ? `${t('common.loading')}...` : t('admin.imageUpload')}
                <input type="file" accept="image/*" onChange={pickImage} className="hidden" disabled={uploading} />
              </label>
            )}
          </Field>
          <Field label={t('admin.category')}>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs border',
                    category === c ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]' : 'bg-transparent border-[var(--hairline)] text-[var(--ink-soft)]'
                  )}
                >{c}</button>
              ))}
            </div>
          </Field>
          <Field label={t('admin.difficulty')}>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <button key={d} type="button" onClick={() => setDifficulty(d)}
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-xl border text-xs uppercase font-mono tracking-[0.18em]',
                    difficulty === d ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]' : 'bg-transparent border-[var(--hairline)] text-[var(--ink-soft)]'
                  )}
                >{t(`difficulty.${d}`)}</button>
              ))}
            </div>
          </Field>
          <Field label={t('admin.explanation')}>
            <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2}
              placeholder={t('admin.explanationHint')}
              className="w-full px-3 py-2 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)] text-sm resize-none" />
          </Field>
          <Field label={t('admin.options')}>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectIndex(i)}
                    className={clsx(
                      'w-7 h-7 rounded-full grid place-items-center font-mono text-xs shrink-0 transition-colors',
                      correctIndex === i ? 'bg-[#4ADE80] text-[#0F2F1A]' : 'border border-[var(--hairline)] text-[var(--ink-soft)]'
                    )}
                  >
                    {correctIndex === i ? <CheckIcon className="w-3.5 h-3.5 stroke-current" /> : String.fromCharCode(65 + i)}
                  </button>
                  <input
                    value={o}
                    onChange={e => setOptions(opts => opts.map((x, j) => j === i ? e.target.value : x))}
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)] text-sm"
                    placeholder={`${t('admin.options')} ${String.fromCharCode(65 + i)}`}
                  />
                </div>
              ))}
            </div>
          </Field>
        </div>
        <div className="flex-shrink-0 px-5 pt-3 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-2xl py-3 border border-[var(--hairline)]">
            {t('admin.cancel')}
          </button>
          <button
            onClick={() => onSave({
              question, options, correctIndex, category,
              difficulty,
              explanation: explanation || undefined,
              imageUrl: imageUrl || undefined,
            })}
            disabled={!question || options.some(o => !o)}
            className="flex-[2] rounded-2xl py-3 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50 font-display text-base"
          >
            {t('admin.save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-1.5">{label}</div>
      {children}
    </div>
  )
}
