import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

const _kThemeModeKey = 'app_theme_mode';
const _kSettingsBox = 'app_settings';

final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(
  ThemeModeNotifier.new,
);

class ThemeModeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    // 同步读取已打开的 Hive box
    try {
      final box = Hive.box<String>(_kSettingsBox);
      final saved = box.get(_kThemeModeKey);
      switch (saved) {
        case 'dark':   return ThemeMode.dark;
        case 'light':  return ThemeMode.light;
        default:       return ThemeMode.system;
      }
    } catch (_) {
      return ThemeMode.system;
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    state = mode;
    try {
      final box = Hive.box<String>(_kSettingsBox);
      final value = switch (mode) {
        ThemeMode.dark   => 'dark',
        ThemeMode.light  => 'light',
        ThemeMode.system => 'system',
      };
      await box.put(_kThemeModeKey, value);
    } catch (_) {}
  }
}
