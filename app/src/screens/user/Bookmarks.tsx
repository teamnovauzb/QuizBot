import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { ArrowIcon, BookIcon } from '../../components/Icons'

export default function Bookmarks() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const bookmarks = useStore(s => s.bookmarks)
  const questions = useStore(s => s.questions)

  const list = useMemo(
    () => bookmarks.map(id => questions.find(q => q.id === id)).filter(Boolean) as typeof questions,
    [bookmarks, questions],
  )

  return (
    <div className="pb-28">
      <PageHeader eyebrow={`${list.length} ${t('home.questions')}`} title={t('nav.bookmarks')} />

      {list.length === 0 ? (
        <div className="px-5 mt-10 text-center">
          <div className="font-display text-7xl text-[var(--ink-soft)] opacity-20 mb-3">⌥</div>
          <div className="text-sm text-[var(--ink-soft)] font-display italic">{t('bookmarks.empty')}</div>
        </div>
      ) : (
        <div className="px-5 space-y-2">
          <button
            onClick={() => navigate(`/u/quiz?ids=${list.map(q => q.id).join(',')}&time=30`)}
            className="w-full rounded-2xl bg-[var(--accent)] text-[var(--ink)] py-4 flex items-center justify-center gap-2 font-display text-xl active:scale-[0.99]"
          >
            <BookIcon className="w-5 h-5" />
            {t('bookmarks.studyAll')}
            <ArrowIcon className="w-5 h-5" />
          </button>
          {list.map((q, i) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-display numerals text-2xl text-[var(--ink-soft)] opacity-30">
                  {(i + 1).toString().padStart(2, '0')}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">{q.category}</span>
              </div>
              <div className="font-display text-base leading-snug">{q.question}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
