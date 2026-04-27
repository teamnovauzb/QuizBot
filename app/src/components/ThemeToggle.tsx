import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredTheme, setTheme, type Theme } from '../lib/theme'
import { SunIcon, MoonIcon, SparkleIcon } from './Icons'
import { haptic } from '../lib/telegram'
import clsx from 'clsx'

export function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, setLocal] = useState<Theme>(getStoredTheme())

  useEffect(() => { setTheme(theme) }, [theme])

  const opts: { v: Theme; label: string; icon: any }[] = [
    { v: 'light', label: t('theme.light'), icon: SunIcon },
    { v: 'dark', label: t('theme.dark'), icon: MoonIcon },
    { v: 'auto', label: t('theme.auto'), icon: SparkleIcon },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map(({ v, label, icon: Icon }) => (
        <button
          key={v}
          onClick={() => { setLocal(v); haptic('light') }}
          className={clsx(
            'rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-all font-display font-semibold text-sm',
            theme === v
              ? 'bg-[var(--accent)] text-[var(--bg)] shadow-[0_8px_24px_-8px_var(--accent-glow)]'
              : 'glass border border-[var(--hairline-strong)] text-[var(--text)]',
          )}
        >
          <Icon className="w-4 h-4 stroke-current" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
