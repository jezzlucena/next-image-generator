import { Locale } from "@/i18n/routing"

/**
 * Hardcoded localized names of the available languages
 * in each respective tongue, plus a flag emoji.
 */
export const LANGUAGES: {
  [key in Locale]: {
    long: string 
    short: string
  }
} = {
  en: {
    long: 'English 🇺🇸',
    short: '🇺🇸',
  },
  es: {
    long: 'Español 🇪🇸',
    short: '🇪🇸',
  },
  pt: {
    long: 'Português 🇧🇷',
    short: '🇧🇷',
  },
}