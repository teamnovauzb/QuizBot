import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { haptic } from '../lib/telegram'
import clsx from 'clsx'

const LANGS = [
  { code: 'uz', label: "O'z" },
  { code: 'ru', label: 'Ру' },
  { code: 'en', label: 'En' },
] as const

export function LangSwitcher() {
  const { i18n } = useTranslation()
  const setLanguage = useStore(s => s.setLanguage)
  const cur = i18n.language as 'uz' | 'ru' | 'en'

  return (
    <div className="inline-flex items-center rounded-2xl glass border border-[var(--hairline)] p-1">
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => { i18n.changeLanguage(l.code); setLanguage(l.code); haptic('light') }}
          className={clsx(
            'px-2.5 py-1 text-xs font-semibold rounded-xl transition-colors',
            cur === l.code ? 'bg-[var(--accent)] text-[var(--bg)]' : 'text-[var(--text-muted)]',
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
