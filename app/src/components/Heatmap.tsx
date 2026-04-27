// Calendar heatmap of activity over the last 90 days

export function Heatmap({ days, max }: { days: { day: string; count: number }[]; max: number }) {
  const weeks: { day: string; count: number }[][] = []
  let cur: { day: string; count: number }[] = []
  for (const d of days) {
    cur.push(d)
    if (cur.length === 7) { weeks.push(cur); cur = [] }
  }
  if (cur.length) weeks.push(cur)

  return (
    <div className="flex gap-[3px]">
      {weeks.map((w, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {w.map(d => {
            const intensity = max ? d.count / max : 0
            return (
              <div
                key={d.day}
                title={`${d.day} · ${d.count}`}
                className="w-3 h-3 rounded-[3px] border border-[var(--hairline)]"
                style={{ background: d.count === 0 ? 'transparent' : `color-mix(in oklab, var(--accent) ${20 + intensity * 70}%, transparent)` }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
