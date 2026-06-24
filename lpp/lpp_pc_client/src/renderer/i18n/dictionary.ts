import type { AppLocale } from './locales';
import { en } from './messages/en';
import { ja } from './messages/ja';
import { th } from './messages/th';
import { vi } from './messages/vi';
import { zhCN, type MessageDictionary } from './messages/zh-CN';
import { zhTW } from './messages/zh-TW';

export const messages: Record<AppLocale, MessageDictionary> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja,
  vi,
  th,
};

export type TranslationParams = Record<string, string | number>;

export function createBrandTranslationParams(
  localeMessages: MessageDictionary,
  fallbackMessages: MessageDictionary,
): TranslationParams {
  const publicName = formatMessage(
    resolveMessage(localeMessages, fallbackMessages, 'brand.publicName'),
  );
  const publicIdLabel = formatMessage(
    resolveMessage(localeMessages, fallbackMessages, 'brand.publicIdLabel'),
    { publicName },
  );
  return { publicName, publicIdLabel };
}

export function resolveMessage(
  localeMessages: MessageDictionary,
  fallbackMessages: MessageDictionary,
  key: string,
) {
  const localized = readNestedString(localeMessages, key);
  if (localized !== undefined) return localized;
  return readNestedString(fallbackMessages, key) ?? key;
}

export function formatMessage(template: string, params?: TranslationParams) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

function readNestedString(source: MessageDictionary, key: string) {
  const value = key.split('.').reduce<unknown>((node, part) => {
    if (!node || typeof node !== 'object') return undefined;
    return (node as Record<string, unknown>)[part];
  }, source);
  return typeof value === 'string' ? value : undefined;
}
