import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader, Card } from '../../components/Shell'
import { PlusIcon, TrashIcon, XIcon, EditIcon } from '../../components/Icons'
import { fetchCategories, upsertCategory, deleteCategory, type CategoryRow } from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'
import { CATEGORIES } from '../../data/questions'
import { haptic } from '../../lib/telegram'

const FALLBACK: CategoryRow[] = CATEGORIES.map((c, i) => ({
  slug: c, name_uz: c, name_ru: c, name_en: c, icon: null, sort_order: (i + 1) * 10, active: true,
}))

export default function Categories() {
  const { t } = useTranslation()
  const [list, setList] = useState<CategoryRow[]>(FALLBACK)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [creating, setCreating] = useState(false)

  async function reload() {
    if (!SUPABASE_ENABLED) return
    const r = await fetchCategories()
    if (r.ok) setList(r.data.length ? r.data : FALLBACK)
  }
  useEffect(() => { reload() }, [])

  return (
    <div className="pb-28">
      <PageHeader
        eyebrow={`${list.length} bo'lim`}
        title={t('nav.categories')}
        right={
          <button onClick={() => { haptic('medium'); setCreating(true) }} className="rounded-full bg-[var(--ink)] text-[var(--paper)] w-12 h-12 grid place-items-center">
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />
      <div className="px-5 mt-2 space-y-2">
        {list.map(c => (
          <Card key={c.slug} className="p-4 flex items-center gap-3">
            <div className="font-display text-2xl numerals w-10 text-center text-[var(--ink-soft)] opacity-30">{c.sort_order}</div>
            <div className="flex-1">
              <div className="font-display text-lg">{c.name_uz}</div>
              <div className="text-xs font-mono text-[var(--ink-soft)]">{c.slug} · {c.name_ru} · {c.name_en}</div>
            </div>
            <button onClick={() => setEditing(c)} className="p-2 text-[var(--ink-soft)]"><EditIcon className="w-4 h-4" /></button>
            <button onClick={async () => {
              if (!confirm(t('admin.confirmDelete'))) return
              await deleteCategory(c.slug); haptic('heavy'); reload()
            }} className="p-2 text-[var(--ink-soft)]"><TrashIcon className="w-4 h-4" /></button>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {(editing || creating) && (
          <CategoryEditor
            initial={editing}
            onClose={() => { setEditing(null); setCreating(false) }}
            onSave={async (c) => {
              await upsertCategory(c); haptic('medium')
              setEditing(null); setCreating(false); reload()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CategoryEditor({ initial, onClose, onSave }: { initial: CategoryRow | null; onClose: () => void; onSave: (c: Partial<CategoryRow> & { slug: string }) => void }) {
  const { t } = useTranslation()
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [nameUz, setNameUz] = useState(initial?.name_uz ?? '')
  const [nameRu, setNameRu] = useState(initial?.name_ru ?? '')
  const [nameEn, setNameEn] = useState(initial?.name_en ?? '')
  const [order, setOrder] = useState(initial?.sort_order ?? 100)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="w-full bg-[var(--paper)] rounded-t-3xl pb-[max(env(safe-area-inset-bottom),20px)]"
        onClick={e => e.stopPropagation()}>
        <div className="pt-3"><div className="w-10 h-1 rounded-full bg-[var(--hairline)] mx-auto" /></div>
        <div className="px-5 py-3 flex items-center justify-between">
          <h3 className="font-display text-2xl">{initial ? t('admin.editCategory') : t('admin.newCategory')}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full border border-[var(--hairline)] grid place-items-center"><XIcon className="w-4 h-4" /></button>
        </div>
        <div className="px-5 space-y-3">
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug (Excel, Word, ...)" disabled={!!initial}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)]" />
          <input value={nameUz} onChange={e => setNameUz(e.target.value)} placeholder="O'zbekcha"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)]" />
          <input value={nameRu} onChange={e => setNameRu(e.target.value)} placeholder="Русский"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)]" />
          <input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="English"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)]" />
          <input type="number" value={order} onChange={e => setOrder(parseInt(e.target.value, 10))} placeholder="sort order"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)]" />
        </div>
        <div className="px-5 pt-4 pb-2">
          <button onClick={() => onSave({ slug, name_uz: nameUz, name_ru: nameRu, name_en: nameEn, sort_order: order, active: true })}
            disabled={!slug || !nameUz} className="w-full rounded-2xl py-3 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50 font-display">
            {t('admin.save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
