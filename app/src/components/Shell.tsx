import { type ReactNode } from 'react'
import clsx from 'clsx'

/**
 * Shell — atmospheric wrapper. Body scrolls naturally (was inner-scroll
 * before, which broke on mobile Telegram). All pages add `pb-24` themselves
 * to clear the fixed TabBar.
 */
export function Shell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx('relative aurora grain', className)}
      style={{ minHeight: 'var(--tg-vh, 100svh)' }}
    >
      {children}
    </div>
  )
}

export function PageHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  // Top padding: respect Telegram/iOS safe-area inset, but never less than 40px
  // so the header doesn't crash into the Telegram top bar / status bar.
  return (
    <header
      className="px-5 pb-3 flex items-end justify-between gap-3 fade-up"
      style={{
        // `--tg-content-top` = absolute distance from top of Mini App window
        // that clears device status bar + Telegram's floating UI (Close
        // button, ⋯ menu, drag handle). Set by initTelegram() at startup.
        // On non-Telegram browsers it's unset → falls back to env() inset.
        // +20px breathing room below whatever inset wins.
        paddingTop:
          'calc(max(var(--tg-content-top, env(safe-area-inset-top, 0px)), 16px) + 20px)',
      }}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="text-[10px] tracking-[0.18em] uppercase font-mono text-[var(--text-muted)] mb-1.5 truncate">{eyebrow}</div>
        )}
        <h1 className="font-display text-[26px] font-bold leading-[1.05] tracking-tight truncate">{title}</h1>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  )
}

export function Hairline({ label }: { label?: string }) {
  if (!label) return <div className="h-px bg-[var(--hairline)] mx-5" />
  return (
    <div className="flex items-center gap-3 px-5 my-3">
      <div className="h-px flex-1 bg-[var(--hairline)]" />
      <span className="text-[10px] uppercase tracking-[0.22em] font-mono text-[var(--text-muted)]">{label}</span>
      <div className="h-px flex-1 bg-[var(--hairline)]" />
    </div>
  )
}

export function Card({ children, className, onClick, glow }: { children: ReactNode; className?: string; onClick?: () => void; glow?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative rounded-3xl glass',
        glow && 'mint-glow',
        onClick && 'cursor-pointer active:scale-[0.99] transition-transform',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function FilledButton({ children, onClick, className, disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'rounded-2xl px-4 py-3 bg-[var(--accent)] text-[var(--bg)] font-display font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        'shadow-[0_8px_24px_-8px_var(--accent-glow)]',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, onClick, className, disabled, active }: { children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'rounded-2xl px-4 py-3 font-display font-medium transition active:scale-[0.98] disabled:opacity-50',
        active
          ? 'bg-[var(--accent)] text-[var(--bg)]'
          : 'glass border border-[var(--hairline-strong)] text-[var(--text)]',
        className,
      )}
    >
      {children}
    </button>
  )
}
