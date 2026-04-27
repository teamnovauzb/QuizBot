// Paste-and-parse bulk question import. Accepts the same "→"-delimited format
// from the source docx, also accepts plain "Q: ... \n A: ..." or CSV-ish.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { Shell, PageHeader, Card } from '../../components/Shell'
import { CheckIcon, XIcon, BookIcon } from '../../components/Icons'

type Parsed = { question: string; answer: string; category: string; raw: string }

function parse(raw: string): Parsed[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const out: Parsed[] = []
  for (let i = 0; i < lines.length - 1; i++) {
    const a = lines[i]
    const b = lines[i + 1]
    // pattern 1:  "1. <Q>" then "→ <A>"
    const m = /^(?:\d+\.\s*)?(.+?[?!.])\s*$/.exec(a)
    const m2 = /^(?:→|->|—|-|A:|J:|Javob:|Ответ:)\s*(.+)$/.exec(b)
    if (m && m2) {
      const q = m[1].trim()
      const ans = m2[1].trim()
      out.push({ question: q, answer: ans, category: guessCategory(q + ' ' + ans), raw: a + '\n' + b })
      i++
      continue
    }
    // pattern 2:  "Q: ..." then "A: ..."
    const m3 = /^Q:\s*(.+)$/i.exec(a)
    const m4 = /^A:\s*(.+)$/i.exec(b)
    if (m3 && m4) {
      out.push({ question: m3[1], answer: m4[1], category: guessCategory(m3[1] + ' ' + m4[1]), raw: a + '\n' + b })
      i++
    }
  }
  return out
}

function guessCategory(text: string): string {
  const t = text.toLowerCase()
  if (/excel|jadval|katak|sum|formula|pivot|vlookup/.test(t)) return 'Excel'
  if (/word|hujjat|matn|page layout|mail merge/.test(t)) return 'Word'
  if (/powerpoint|slayd|taqdimot/.test(t)) return 'PowerPoint'
  if (/cloud|bulutli|drive|dropbox|onedrive/.test(t)) return 'Cloud'
  if (/cpu|ram|disk|bios|chipset|motherboard|gpu|cmos|psu/.test(t)) return 'Hardware'
  if (/operatsion|kernel|fayl tizim|windows|linux|macos/.test(t)) return 'OS'
  if (/internet|protokol|http|email|modem|router/.test(t)) return 'Network'
  if (/printer|skanner|sichqoncha|monitor|klaviatura/.test(t)) return 'I/O'
  return 'Umumiy'
}

export default function BulkImport() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addQuestion = useStore(s => s.addQuestion)
  const _qs = useStore(s => s.questions)
  const allAnswers = useMemo(() => _qs.map(q => q.options[q.correctIndex]), [_qs])

  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState<Parsed[] | null>(null)
  const [imported, setImported] = useState(0)

  function preview() {
    setParsed(parse(raw))
  }

  function commit() {
    if (!parsed) return
    let count = 0
    for (const p of parsed) {
      // build options: correct + 3 distractors picked from existing answers (different category preferred)
      const others = allAnswers.filter(a => a !== p.answer)
      const distractors = shuffle(others, count + 1).slice(0, 3)
      const opts = shuffle([p.answer, ...distractors], count + 13)
      const correctIndex = opts.indexOf(p.answer)
      addQuestion({ category: p.category, question: p.question, options: opts, correctIndex })
      count++
    }
    setImported(count)
    setParsed(null); setRaw('')
  }

  return (
    <Shell>
      <PageHeader eyebrow={t('admin.bulkImport')} title={t('admin.bulkImportTitle')} />
      <div className="px-5 flex-1 overflow-y-auto pb-24">
        <Card className="p-4 mb-4">
          <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-2">{t('admin.bulkPasteHint')}</div>
          <textarea
            value={raw}
            onChange={e => setRaw(e.target.value)}
            rows={10}
            className="w-full font-mono text-xs bg-[var(--paper)] rounded-xl border border-[var(--hairline)] p-3 leading-relaxed"
            placeholder={`1. Excel fayllarining kengaytmasi nima?\n→ .xlsx\n\n2. Find and Replace qayerda?\n→ Home menyusi`}
          />
        </Card>

        <div className="flex gap-2">
          <button
            onClick={() => { setRaw(''); setParsed(null) }}
            className="rounded-2xl py-3 px-4 border border-[var(--hairline)] text-sm"
          >{t('common.clear')}</button>
          <button
            onClick={preview}
            disabled={!raw.trim()}
            className="flex-1 rounded-2xl py-3 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50 font-display"
          >{t('admin.preview')}</button>
        </div>

        {parsed && (
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">{parsed.length} {t('admin.detected')}</span>
              <div className="h-px flex-1 bg-[var(--hairline)]" />
            </div>
            {parsed.length === 0 ? (
              <Card className="p-6 text-center text-sm font-display italic">{t('admin.parseFailed')}</Card>
            ) : (
              <>
                <ul className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto">
                  {parsed.slice(0, 30).map((p, i) => (
                    <Card key={i} className="p-3">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-mono text-[10px] text-[var(--ink-soft)]">#{i + 1}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">{p.category}</span>
                      </div>
                      <div className="font-display text-sm leading-snug mb-1">{p.question}</div>
                      <div className="text-xs text-[var(--ink-soft)] flex items-start gap-1">
                        <CheckIcon className="w-3 h-3 stroke-[var(--accent)] shrink-0 mt-0.5" />
                        <span>{p.answer}</span>
                      </div>
                    </Card>
                  ))}
                </ul>
                <button
                  onClick={commit}
                  className="w-full rounded-2xl py-4 bg-[var(--accent)] text-[var(--ink)] font-display text-xl flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <BookIcon className="w-5 h-5" />
                  {t('admin.importAll', { count: parsed.length })}
                </button>
              </>
            )}
          </div>
        )}

        {imported > 0 && (
          <div className="mt-5 p-4 rounded-2xl bg-[#0F2F1A]/40 text-[#4ADE80] flex items-center gap-3">
            <CheckIcon className="w-5 h-5" />
            <span className="font-display">{t('admin.imported', { count: imported })}</span>
            <button onClick={() => navigate('/admin/questions')} className="ml-auto text-xs uppercase font-mono tracking-[0.18em]">→</button>
          </div>
        )}

        <div className="mt-8">
          <button onClick={() => navigate('/admin/questions')} className="w-full rounded-2xl border border-[var(--hairline)] py-3 text-sm font-mono uppercase tracking-[0.18em] text-[var(--ink-soft)] flex items-center justify-center gap-2">
            <XIcon className="w-3 h-3" /> {t('common.cancel')}
          </button>
        </div>
      </div>
    </Shell>
  )
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]; let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
