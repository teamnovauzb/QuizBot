import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import uz from './uz'
import ru from './ru'
import en from './en'

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null
const tgLang = (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code) as string | undefined
const detected = stored || (tgLang === 'ru' ? 'ru' : tgLang === 'en' ? 'en' : 'uz')

i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: detected,
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
})

export default i18n
