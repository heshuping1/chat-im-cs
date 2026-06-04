export const supportedLocales = ['zh-CN', 'zh-TW', 'en', 'ja', 'vi', 'th'] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = 'zh-CN';

export const localeLabels: Record<AppLocale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
  vi: 'Tiếng Việt',
  th: 'ไทย',
};

export function isSupportedLocale(value: unknown): value is AppLocale {
  return supportedLocales.includes(value as AppLocale);
}

export function normalizeLocale(value: unknown): AppLocale {
  if (isSupportedLocale(value)) return value;
  if (typeof value !== 'string') return defaultLocale;
  const normalized = value.replace('_', '-');
  if (isSupportedLocale(normalized)) return normalized;
  const languageCode = normalized.split('-')[0];
  if (languageCode === 'zh') return defaultLocale;
  return isSupportedLocale(languageCode) ? languageCode : defaultLocale;
}
