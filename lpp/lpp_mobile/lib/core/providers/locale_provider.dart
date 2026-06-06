import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

const _kLocaleKey = 'app_locale';
const _kSettingsBox = 'app_settings';

final localeProvider = NotifierProvider<LocaleNotifier, Locale>(LocaleNotifier.new);

class LocaleNotifier extends Notifier<Locale> {
  @override
  Locale build() {
    // 同步读取缓存（Hive 已在 main 里初始化，可以同步访问）
    try {
      final box = Hive.box<String>(_kSettingsBox);
      final saved = box.get(_kLocaleKey);
      if (saved != null) {
        final parts = saved.split('_');
        return parts.length >= 2
            ? Locale(parts[0], parts[1])
            : Locale(parts[0]);
      }
    } catch (_) {}
    return const Locale('zh', 'CN');
  }

  Future<void> setLocale(Locale locale) async {
    state = locale;
    try {
      final box = Hive.box<String>(_kSettingsBox);
      final key = locale.countryCode != null && locale.countryCode!.isNotEmpty
          ? '${locale.languageCode}_${locale.countryCode}'
          : locale.languageCode;
      await box.put(_kLocaleKey, key);
    } catch (_) {}
  }
}

/// 支持的语言列表
const kSupportedLocales = [
  (Locale('zh', 'CN'), '简体中文'),
  (Locale('zh', 'TW'), '繁體中文'),
  (Locale('en'), 'English'),
  (Locale('ja'), '日本語'),
  (Locale('ko'), '한국어'),
  (Locale('vi'), 'Tiếng Việt'),
];

String translationTargetLanguageForLocale(Locale locale) {
  final languageCode = locale.languageCode.toLowerCase();
  final countryCode = locale.countryCode?.toUpperCase();
  if (languageCode == 'zh') {
    return switch (countryCode) {
      'TW' || 'HK' || 'MO' => 'zh-TW',
      _ => 'zh-CN',
    };
  }
  if (const {'en', 'ja', 'ko', 'vi'}.contains(languageCode)) {
    return languageCode;
  }
  return 'zh-CN';
}
