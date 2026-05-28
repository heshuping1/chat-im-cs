import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

/// 亮色颜色常量（微信亮色风格）
class AppColors {
  AppColors._();
  static const Color primary = Color(0xFF07C160);
  static const Color background = Color(0xFFEDEDED); // 微信亮色页面背景
  static const Color surface = Color(0xFFFFFFFF);
  static const Color textPrimary = Color(0xFF1D2129);
  static const Color textSecondary = Color(0xFF86909C);
  static const Color divider = Color(0xFFE5E6EB);
  static const Color online = Color(0xFF00B27A);
  static const Color danger = Color(0xFFFF3B30);
  static const Color disabled = Color(0xFFBBBBBB);
}

/// 暗色颜色常量（严格对照微信暗色模式）
///
/// 微信暗色色调：
///   页面背景      #111111  近纯黑
///   卡片/列表项   #1C1C1C  深灰
///   次级背景      #2C2C2C  搜索框、输入框、弹窗
///   分割线        #2C2C2C  极细，几乎不可见
///   主文字        #FFFFFF
///   次要文字      #8C8C8C
///   图标/箭头     #8C8C8C
///   自己气泡      #3D7A4F  深绿
///   对方气泡      #2C2C2C
class AppDarkColors {
  AppDarkColors._();
  static const Color primary = Color(0xFF07C160);
  // 页面背景：微信暗色是近纯黑 #111111
  static const Color background = Color(0xFF111111);
  // 卡片/列表项背景：#1C1C1C
  static const Color surface = Color(0xFF1C1C1C);
  // 次级背景（搜索框、输入框、弹窗内容区）：#2C2C2C
  static const Color surfaceVariant = Color(0xFF2C2C2C);
  // 主文字
  static const Color textPrimary = Color(0xFFFFFFFF);
  // 次要文字
  static const Color textSecondary = Color(0xFF8C8C8C);
  // 分割线（极细，微信几乎不可见）
  static const Color divider = Color(0xFF2C2C2C);
  static const Color online = Color(0xFF30D158);
  static const Color danger = Color(0xFFFF453A);
  static const Color disabled = Color(0xFF636366);
  // 自己发的消息气泡（深绿）
  static const Color selfBubble = Color(0xFF3D7A4F);
  // 对方消息气泡
  static const Color otherBubble = Color(0xFF2C2C2C);
}

/// 文字样式（向后兼容）
class AppTextStyles {
  AppTextStyles._();
  static const TextStyle headline1 = TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
      height: 1.4);
  static const TextStyle headline2 = TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
      height: 1.4);
  static const TextStyle title = TextStyle(
      fontSize: 17,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
      height: 1.4);
  static const TextStyle body = TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w400,
      color: AppColors.textPrimary,
      height: 1.5);
  static const TextStyle bodySecondary = TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w400,
      color: AppColors.textSecondary,
      height: 1.5);
  static const TextStyle caption = TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      color: AppColors.textSecondary,
      height: 1.4);
  static const TextStyle button = TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w500,
      color: AppColors.surface,
      height: 1.4);
}

/// 应用主题
class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme => _buildTheme(Brightness.light);
  static ThemeData get darkTheme => _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    final bg = isDark ? AppDarkColors.background : AppColors.background;
    final surface = isDark ? AppDarkColors.surface : AppColors.surface;
    final textPrimary =
        isDark ? AppDarkColors.textPrimary : AppColors.textPrimary;
    final textSecondary =
        isDark ? AppDarkColors.textSecondary : AppColors.textSecondary;
    final dividerColor = isDark ? AppDarkColors.divider : AppColors.divider;
    final danger = isDark ? AppDarkColors.danger : AppColors.danger;
    // 次级背景：搜索框、输入框、弹窗
    final surfaceVariant =
        isDark ? AppDarkColors.surfaceVariant : const Color(0xFFF2F2F7);

    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.primary,
      onSecondary: Colors.white,
      error: danger,
      onError: Colors.white,
      surface: surface,
      onSurface: textPrimary,
      // surfaceContainerHighest 用于：搜索框背景、次级容器、分组 header
      surfaceContainerHighest: surfaceVariant,
      outline: dividerColor,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: bg,
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        foregroundColor: textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        systemOverlayStyle: isDark
            ? const SystemUiOverlayStyle(
                statusBarColor: Colors.transparent,
                statusBarIconBrightness: Brightness.light,
                statusBarBrightness: Brightness.dark,
              )
            : const SystemUiOverlayStyle(
                statusBarColor: Colors.transparent,
                statusBarIconBrightness: Brightness.dark,
                statusBarBrightness: Brightness.light,
              ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle:
            const TextStyle(fontSize: 10, fontWeight: FontWeight.w500),
        unselectedLabelStyle:
            const TextStyle(fontSize: 10, fontWeight: FontWeight.w400),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceVariant,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: danger),
        ),
        hintStyle: TextStyle(color: textSecondary, fontSize: 15),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        margin: EdgeInsets.zero,
      ),
      dividerTheme: DividerThemeData(
        color: dividerColor,
        thickness: 0.5,
        space: 0,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        contentTextStyle: TextStyle(
          fontSize: 14,
          color: textPrimary,
          height: 1.4,
        ),
      ),
      listTileTheme: ListTileThemeData(
        textColor: textPrimary,
        iconColor: textPrimary,
        titleTextStyle: TextStyle(fontSize: 16, color: textPrimary),
        subtitleTextStyle: TextStyle(fontSize: 13, color: textSecondary),
      ),
      textTheme: TextTheme(
        displayLarge: TextStyle(
            fontSize: 24, fontWeight: FontWeight.w600, color: textPrimary),
        displayMedium: TextStyle(
            fontSize: 20, fontWeight: FontWeight.w600, color: textPrimary),
        titleLarge: TextStyle(
            fontSize: 17, fontWeight: FontWeight.w600, color: textPrimary),
        bodyLarge: TextStyle(
            fontSize: 15, fontWeight: FontWeight.w400, color: textPrimary),
        bodyMedium: TextStyle(
            fontSize: 15, fontWeight: FontWeight.w400, color: textSecondary),
        labelSmall: TextStyle(
            fontSize: 12, fontWeight: FontWeight.w400, color: textSecondary),
        labelLarge: const TextStyle(
            fontSize: 16, fontWeight: FontWeight.w500, color: Colors.white),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(double.infinity, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      iconTheme: IconThemeData(color: textPrimary, size: 24),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.windows: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }
}
