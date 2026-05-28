import 'package:flutter/material.dart';
import 'package:lpp_mobile/app/theme/theme.dart';

/// 通过 BuildContext 动态获取当前主题颜色
/// 用法：context.colors.background
extension AppThemeExtension on BuildContext {
  AppColorTokens get colors => AppColorTokens(this);
}

class AppColorTokens {
  final BuildContext _context;
  const AppColorTokens(this._context);

  bool get isDark => Theme.of(_context).brightness == Brightness.dark;

  // 背景色
  Color get background => isDark ? AppDarkColors.background : const Color(0xFFEDEDED);
  Color get backgroundChat => isDark ? const Color(0xFF1C1C1E) : const Color(0xFFEDEDED);

  // 卡片/列表项背景
  Color get surface => isDark ? AppDarkColors.surface : Colors.white;
  Color get surfaceVariant => isDark ? AppDarkColors.surfaceVariant : const Color(0xFFF2F2F7);

  // 文字
  Color get textPrimary => isDark ? AppDarkColors.textPrimary : const Color(0xFF1D2129);
  Color get textSecondary => isDark ? AppDarkColors.textSecondary : const Color(0xFF86909C);

  // 分割线
  Color get divider => isDark ? AppDarkColors.divider : const Color(0xFFE5E6EB);

  // 主色
  Color get primary => AppColors.primary;

  // 消息气泡
  Color get selfBubble => isDark ? const Color(0xFF1A4731) : const Color(0xFFDCF8C6);
  Color get otherBubble => isDark ? AppDarkColors.surface : Colors.white;

  // 输入框背景
  Color get inputBackground => isDark ? AppDarkColors.surfaceVariant : const Color(0xFFF7F8FA);

  // 搜索框背景
  Color get searchBackground => isDark ? AppDarkColors.surfaceVariant : const Color(0xFFF2F2F7);

  // 危险色
  Color get danger => isDark ? AppDarkColors.danger : const Color(0xFFFF3B30);

  // 图标色
  Color get icon => isDark ? AppDarkColors.textPrimary : const Color(0xFF1D2129);
  Color get iconSecondary => isDark ? AppDarkColors.textSecondary : const Color(0xFF86909C);
}
