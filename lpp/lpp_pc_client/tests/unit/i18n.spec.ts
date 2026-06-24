import { describe, expect, it } from 'vitest';
import {
  createBrandTranslationParams,
  formatMessage,
  messages,
  resolveMessage,
} from '../../src/renderer/i18n/dictionary';
import { defaultLocale, normalizeLocale, supportedLocales } from '../../src/renderer/i18n/locales';

describe('i18n foundation', () => {
  it('normalizes unsupported locale values to zh-CN', () => {
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('zh_TW')).toBe('zh-TW');
    expect(normalizeLocale('zh-Hans-CN')).toBe(defaultLocale);
    expect(normalizeLocale('fr-FR')).toBe(defaultLocale);
    expect(normalizeLocale(null)).toBe(defaultLocale);
  });

  it('falls back to zh-CN when a key is missing', () => {
    expect(
      resolveMessage(
        { ...messages.en, app: { ...messages.en.app, loading: undefined as never } },
        messages[defaultLocale],
        'app.loading',
      ),
    ).toBe('正在加载...');
  });

  it('returns the key when both localized and fallback messages are missing', () => {
    expect(resolveMessage(messages.en, messages[defaultLocale], 'missing.key')).toBe(
      'missing.key',
    );
  });

  it('formats message parameters without losing unknown placeholders', () => {
    expect(formatMessage('{count} unread from {name}', { count: 3 })).toBe(
      '3 unread from {name}',
    );
  });

  it('derives public identity labels from the shared brand name', () => {
    const zhBrand = createBrandTranslationParams(messages['zh-CN'], messages[defaultLocale]);
    const enBrand = createBrandTranslationParams(messages.en, messages[defaultLocale]);

    expect(zhBrand).toMatchObject({ publicName: '星络', publicIdLabel: '星络号' });
    expect(enBrand).toMatchObject({ publicName: 'StartLink', publicIdLabel: 'StartLink ID' });
  });

  it('keeps dictionary keys aligned across all supported locales', () => {
    const templateKeys = flattenKeys(messages[defaultLocale]);
    for (const locale of supportedLocales) {
      expect(flattenKeys(messages[locale]), locale).toEqual(templateKeys);
    }
  });
});

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value)
    .flatMap(([key, child]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      return typeof child === 'string' ? [nextPrefix] : flattenKeys(child, nextPrefix);
    })
    .sort();
}
