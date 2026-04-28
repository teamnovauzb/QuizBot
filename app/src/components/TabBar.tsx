import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { haptic } from '../lib/telegram'

export type Tab = { to: string; label: string; icon: ReactNode }

/**
 * Fixed bottom navigation. Body scrolls underneath; pages add `pb-24` to
 * leave space. Compatible with iOS/Android safe-area inset.
 */
export function TabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),10px)]">
      <div className="glass-strong rounded-3xl px-1.5 py-1.5 flex items-stretch justify-around gap-0.5 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.4)]">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to.endsWith('/u') || t.to.endsWith('/admin') || t.to.endsWith('/super')}
            onClick={() => haptic('light')}
            className={({ isActive }) => clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl transition-colors relative',
              isActive ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : 'text-[var(--text-muted)]',
            )}
          >
            <span className="block w-[18px] h-[18px]">{t.icon}</span>
            <span className="text-[9px] font-semibold tracking-tight">{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
