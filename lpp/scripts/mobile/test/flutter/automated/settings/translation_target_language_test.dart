import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/providers/locale_provider.dart';

void main() {
  group('translationTargetLanguageForLocale', () {
    test('maps supported app system languages to translation target codes', () {
      expect(translationTargetLanguageForLocale(const Locale('zh', 'CN')),
          'zh-CN');
      expect(translationTargetLanguageForLocale(const Locale('zh', 'TW')),
          'zh-TW');
      expect(translationTargetLanguageForLocale(const Locale('en')), 'en');
      expect(translationTargetLanguageForLocale(const Locale('ja')), 'ja');
      expect(translationTargetLanguageForLocale(const Locale('ko')), 'ko');
      expect(translationTargetLanguageForLocale(const Locale('vi')), 'vi');
    });

    test('defaults unknown or generic Chinese locales conservatively', () {
      expect(translationTargetLanguageForLocale(const Locale('zh')), 'zh-CN');
      expect(translationTargetLanguageForLocale(const Locale('zh', 'HK')),
          'zh-TW');
      expect(translationTargetLanguageForLocale(const Locale('fr')), 'zh-CN');
    });
  });
}
