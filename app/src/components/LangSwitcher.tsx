import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { haptic } from '../lib/telegram'

const LANGS = [
  { code: 'uz', label: 'O‘Z' },
  { code: 'ru', label: 'РУ' },
  { code: 'en', label: 'EN' },
] as const

export function LangSwitcher() {
  const { i18n } = useTranslation()
  const setLanguage = useStore(s => s.setLanguage)
  const cur = i18n.language as 'uz' | 'ru' | 'en'

  return (
    <div className="inline-flex items-center rounded-full border border-[var(--hairline)] p-0.5 bg-[var(--paper-2)]">
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => { i18n.changeLanguage(l.code); setLanguage(l.code); haptic('light') }}
          className={
            'px-2.5 py-1 text-[11px] font-mono tracking-[0.18em] rounded-full transition-colors ' +
            (cur === l.code ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-soft)]')
          }
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
