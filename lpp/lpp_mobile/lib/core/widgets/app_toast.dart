import 'package:flutter/material.dart';

class AppToast {
  const AppToast._();

  static void success(BuildContext context, String message) {
    show(context, message, type: AppToastType.success);
  }

  static void error(
    BuildContext context, [
    String message = '操作失败，请重试',
  ]) {
    show(context, message, type: AppToastType.error);
  }

  static void info(BuildContext context, String message) {
    show(context, message, type: AppToastType.info);
  }

  static void comingSoon(BuildContext context, [String? feature]) {
    final text = feature == null || feature.trim().isEmpty
        ? '功能即将上线'
        : '${feature.trim()} 功能即将上线';
    show(context, text, type: AppToastType.info);
  }

  static void missingApi(BuildContext context, String feature) {
    show(
      context,
      '$feature 缺少服务端接口，请联系服务端补充',
      type: AppToastType.warning,
      duration: const Duration(seconds: 4),
    );
  }

  static void show(
    BuildContext context,
    String message, {
    AppToastType type = AppToastType.info,
    Duration duration = const Duration(seconds: 2),
  }) {
    if (!context.mounted) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;
    final theme = Theme.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: TextStyle(color: _foreground(theme, type)),
        ),
        behavior: SnackBarBehavior.floating,
        duration: duration,
        backgroundColor: _background(theme, type),
      ),
    );
  }

  static Color _background(ThemeData theme, AppToastType type) {
    final isDark = theme.brightness == Brightness.dark;
    return switch (type) {
      AppToastType.success =>
        isDark ? const Color(0xFF0F5A3D) : const Color(0xFF07C160),
      AppToastType.error =>
        isDark ? const Color(0xFF7F1D1D) : const Color(0xFFE53935),
      AppToastType.warning =>
        isDark ? const Color(0xFF7A4D00) : const Color(0xFFFFA000),
      AppToastType.info =>
        isDark ? const Color(0xFF2E3238) : const Color(0xFF323232),
    };
  }

  static Color _foreground(ThemeData theme, AppToastType type) {
    return Colors.white;
  }
}

enum AppToastType { success, error, warning, info }
