import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { haptic } from '../lib/telegram'

export type Tab = { to: string; label: string; icon: ReactNode }

export function TabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="sticky bottom-0 mt-auto z-30 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="glass-strong rounded-3xl px-1.5 py-1.5 flex items-stretch justify-around gap-0.5 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.4)]">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to.endsWith('/u') || t.to.endsWith('/admin') || t.to.endsWith('/super')}
            onClick={() => haptic('light')}
            className={({ isActive }) => clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl transition-colors relative',
              isActive ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : 'text-[var(--text-muted)]',
            )}
          >
            <span className="block w-5 h-5">{t.icon}</span>
            <span className="text-[10px] font-medium tracking-tight">{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
