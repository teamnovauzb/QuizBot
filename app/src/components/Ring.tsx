export function Ring({ pct, size = 56, stroke = 4, label, color = 'var(--accent)' }: { pct: number; size?: number; stroke?: number; label?: string; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--hairline)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, pct))/100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-sm numerals leading-none">{Math.round(pct)}<span className="text-[10px] opacity-50">%</span></span>
      </div>
      {label && <div className="text-center mt-1 text-[9px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] opacity-70">{label}</div>}
    </div>
  )
}
