import seed from './seed.json'

export type Question = {
  id: string
  number: number
  category: string
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

type SeedItem = { id: number; q: string; a: string }
const seedTyped = seed as SeedItem[]

function categoryFor(q: string, a: string): string {
  const t = (q + ' ' + a).toLowerCase()
  if (/excel|jadval|katak|sum|formula|pivot|vlookup|autosum|conditional formatting|named range/.test(t)) return 'Excel'
  if (/word|hujjat|matn|page layout|mail merge|find and replace|paragraf/.test(t)) return 'Word'
  if (/powerpoint|slayd|taqdimot|narration|hyperlink/.test(t)) return 'PowerPoint'
  if (/cloud|bulutli|drive|dropbox|onedrive|saas|paas|iaas|scalability/.test(t)) return 'Cloud'
  if (/cpu|ram|disk|bios|chipset|motherboard|gpu|cmos|psu|cache|ona plata|kompyuter|kompyuterning|hyper-threading|interrupt|dma/.test(t)) return 'Hardware'
  if (/operatsion|kernel|fayl tizim|multi-?dasturlash|real-time os|windows|linux|macos/.test(t)) return 'OS'
  if (/internet|protokol|http|email|elektron pochta|modem|router|wi-?fi/.test(t)) return 'Network'
  if (/printer|skanner|sichqoncha|monitor|klaviatura|kursor|kiritish|chiqish/.test(t)) return 'I/O'
  return 'Umumiy'
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDistractors(correct: string, all: string[], cat: string, allByCat: Map<string, string[]>, n: number, seed: number): string[] {
  const same = (allByCat.get(cat) ?? []).filter(x => x !== correct)
  const shuffledSame = shuffle(same, seed)
  const others = all.filter(x => x !== correct && !same.includes(x))
  const shuffledOthers = shuffle(others, seed * 7)
  const pool = [...shuffledSame, ...shuffledOthers]
  const out: string[] = []
  for (const o of pool) {
    if (out.length >= n) break
    if (Math.abs(o.length - correct.length) > correct.length * 1.6 && correct.length > 30) continue
    out.push(o)
  }
  while (out.length < n) out.push(pool[out.length] ?? correct.slice(0, 8) + '...')
  return out.slice(0, n)
}

const allAnswers = seedTyped.map(s => s.a)
const byCat = new Map<string, string[]>()
for (const s of seedTyped) {
  const cat = categoryFor(s.q, s.a)
  if (!byCat.has(cat)) byCat.set(cat, [])
  byCat.get(cat)!.push(s.a)
}

export const QUESTIONS: Question[] = seedTyped.map((s) => {
  const cat = categoryFor(s.q, s.a)
  const distractors = pickDistractors(s.a, allAnswers, cat, byCat, 3, s.id * 31 + 7)
  const all = [s.a, ...distractors]
  const order = shuffle(all, s.id * 13 + 1)
  const correctIndex = order.indexOf(s.a)
  return {
    id: `q-${s.id}`,
    number: s.id,
    category: cat,
    question: s.q,
    options: order,
    correctIndex,
  }
})

export const CATEGORIES = Array.from(new Set(QUESTIONS.map(q => q.category)))

export function pickQuiz(opts: { count: number; categories?: string[]; seed?: number }): Question[] {
  let pool = QUESTIONS
  if (opts.categories && opts.categories.length) {
    pool = pool.filter(q => opts.categories!.includes(q.category))
  }
  const seed = opts.seed ?? Date.now()
  const shuffled = shuffle(pool, seed)
  return shuffled.slice(0, Math.min(opts.count, shuffled.length))
}
