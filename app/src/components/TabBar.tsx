import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { haptic } from '../lib/telegram'

export type Tab = { to: string; label: string; icon: ReactNode }

export function TabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="sticky bottom-0 mt-auto z-30 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] px-3 bg-[color-mix(in_oklab,var(--paper)_85%,transparent)] backdrop-blur-md border-t border-[var(--hairline)]">
      <ul className="flex items-stretch justify-around gap-1">
        {tabs.map(t => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              onClick={() => haptic('light')}
              className={({ isActive }) => clsx(
                'flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-colors relative',
                isActive ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)] opacity-60',
              )}
            >
              {({ isActive }) => (
                <>
                  <span className="block w-5 h-5">{t.icon}</span>
                  <span className="text-[10px] font-mono uppercase tracking-[0.14em]">{t.label}</span>
                  {isActive && <span className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-[2px] bg-[var(--accent)] rounded-full" />}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
