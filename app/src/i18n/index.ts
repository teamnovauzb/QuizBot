import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import uz from './uz'
import ru from './ru'
import en from './en'

// Default language is ALWAYS Uzbek unless the user has explicitly chosen
// another in Settings. We intentionally don't auto-switch based on
// Telegram's `language_code` — many target users have their phone in
// Russian but want the app in Uzbek.
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null
const detected: 'uz' | 'ru' | 'en' = stored === 'ru' || stored === 'en' ? stored : 'uz'

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
