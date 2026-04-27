type P = { className?: string }
const base = 'w-full h-full stroke-current'
const sw = 1.5

export const HomeIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11.5L12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
)
export const HistoryIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /><path d="M12 7v5l3 2" />
  </svg>
)
export const UserIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
  </svg>
)
export const QuestionIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-.8.6-1.5 1-1.5 2v.5" /><path d="M12 17h.01" />
  </svg>
)
export const UsersIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.5" /><path d="M2 20c1-3.5 3.8-5 7-5s6 1.5 7 5" /><circle cx="17" cy="9" r="2.5" /><path d="M14.5 13.5c2.5.5 4.7 2 5.5 5" />
  </svg>
)
export const ChartIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" />
  </svg>
)
export const ShieldIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" /><path d="M9 12l2 2 4-4" />
  </svg>
)
export const SettingsIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </svg>
)
export const ArrowIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
  </svg>
)
export const CheckIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4 10-10" />
  </svg>
)
export const XIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6l12 12" /><path d="M18 6L6 18" />
  </svg>
)
export const PlusIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" /><path d="M5 12h14" />
  </svg>
)
export const SparkleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" /><path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8L16.5 18.5l1.8-.7L19 16z" />
  </svg>
)
export const FlameIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3c1 3 4 5 4 9a4 4 0 1 1-8 0c0-2 1-3 1-5 0-1-.5-1.5-.5-2.5C8.5 3 11 3 12 3z" />
  </svg>
)
export const BookIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h7a4 4 0 0 1 4 4v12" /><path d="M20 4h-7a4 4 0 0 0-4 4v12" />
  </svg>
)
export const TrashIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
  </svg>
)
export const EditIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4l6 6L8 22H2v-6L14 4z" />
  </svg>
)
export const SearchIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" />
  </svg>
)
export const ClockIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
)
export const SendIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={sw} className={p.className ?? base} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
)
