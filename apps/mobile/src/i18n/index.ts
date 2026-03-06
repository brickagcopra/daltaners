import en from './en.json';
import fil from './fil.json';
import ceb from './ceb.json';

export type Language = 'en' | 'fil' | 'ceb';

const translations: Record<Language, typeof en> = {
  en,
  fil: fil as typeof en,
  ceb: ceb as typeof en,
};

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: string, params?: Record<string, string>): string {
  const keys = key.split('.');
  let value: unknown = translations[currentLanguage];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      // Fallback to English
      value = translations.en;
      for (const fk of keys) {
        if (value && typeof value === 'object' && fk in value) {
          value = (value as Record<string, unknown>)[fk];
        } else {
          return key;
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') return key;

  // Replace template params: {{name}} → actual value
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => params[paramKey] ?? `{{${paramKey}}}`);
  }

  return value;
}

export { en, fil, ceb };
