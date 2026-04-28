import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { haptic } from '../lib/telegram'
import { XIcon } from './Icons'

export type Tab = { to: string; label: string; icon: ReactNode }

/**
 * Fixed bottom navigation. Body scrolls underneath; pages add `pb-24` to
 * leave space. When more than 5 tabs are passed, the first 4 are visible
 * and the rest go behind a "More" tab that opens a bottom sheet.
 */
export function TabBar({ tabs, max = 5 }: { tabs: Tab[]; max?: number }) {
  const overflow = tabs.length > max
  const visible = overflow ? tabs.slice(0, max - 1) : tabs
  const hidden = overflow ? tabs.slice(max - 1) : []
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),10px)]">
        <div className="glass-strong rounded-3xl px-1.5 py-1.5 flex items-stretch justify-around gap-0.5 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.4)]">
          {visible.map(t => (
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
          {overflow && (
            <button
              onClick={() => { haptic('light'); setMoreOpen(true) }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl text-[var(--text-muted)]"
            >
              <span className="block w-[18px] h-[18px]"><MoreDots /></span>
              <span className="text-[9px] font-semibold tracking-tight">…</span>
            </button>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-end bg-black/40"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="w-full bg-[var(--bg)] glass-strong rounded-t-3xl pb-[max(env(safe-area-inset-bottom),24px)] pt-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-[var(--hairline-strong)] mx-auto mb-3" />
              <div className="px-5 pb-3 flex items-center justify-between">
                <h3 className="font-display font-bold text-lg">More</h3>
                <button onClick={() => setMoreOpen(false)} className="w-9 h-9 rounded-full glass border border-[var(--hairline-strong)] grid place-items-center">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 grid grid-cols-2 gap-2 pb-2">
                {hidden.map(t => (
                  <button
                    key={t.to}
                    onClick={() => { setMoreOpen(false); haptic('medium'); navigate(t.to) }}
                    className="rounded-2xl glass border border-[var(--hairline-strong)] p-4 flex items-center gap-3 text-left"
                  >
                    <span className="block w-5 h-5 text-[var(--accent)]">{t.icon}</span>
                    <span className="font-display font-semibold text-sm truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function MoreDots() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  )
}
