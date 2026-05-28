import 'package:flutter/material.dart';

/// 响应式布局 Widget。
///
/// 移动端：单栏布局。
/// 平板/窄桌面：双栏布局（左侧列表 + 右侧内容）。
/// 桌面宽屏：三栏布局（左侧列表 + 中间内容 + 右侧上下文）。
class ResponsiveLayout extends StatelessWidget {
  /// 移动端单栏内容
  final Widget mobile;

  /// 宽屏左侧面板（通常是会话列表）
  final Widget? sidePanel;

  /// 宽屏右侧内容区域
  final Widget? contentPanel;

  /// 桌面端右侧上下文面板，例如客户画像、资料、交易摘要。
  final Widget? tertiaryPanel;

  /// 双栏断点。
  final double breakpoint;

  /// 三栏桌面断点。
  final double desktopBreakpoint;

  final double sidePanelWidth;

  final double tertiaryPanelWidth;

  const ResponsiveLayout({
    super.key,
    required this.mobile,
    this.sidePanel,
    this.contentPanel,
    this.tertiaryPanel,
    this.breakpoint = compactBreakpoint,
    this.desktopBreakpoint = expandedBreakpoint,
    this.sidePanelWidth = 320,
    this.tertiaryPanelWidth = 360,
  });

  static const double compactBreakpoint = 600.0;
  static const double expandedBreakpoint = 1100.0;

  static bool isWideScreen(BuildContext context) =>
      MediaQuery.sizeOf(context).width > compactBreakpoint;

  static bool isDesktopScreen(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= expandedBreakpoint;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final useThreePane = width >= desktopBreakpoint &&
        sidePanel != null &&
        tertiaryPanel != null;
    if (useThreePane) {
      return Row(
        children: [
          SizedBox(
            width: sidePanelWidth,
            child: sidePanel!,
          ),
          const VerticalDivider(width: 1),
          Expanded(
            child: contentPanel ?? const _EmptyContentPanel(),
          ),
          const VerticalDivider(width: 1),
          SizedBox(
            width: tertiaryPanelWidth,
            child: tertiaryPanel!,
          ),
        ],
      );
    }

    if (width > breakpoint && sidePanel != null) {
      return Row(
        children: [
          SizedBox(
            width: sidePanelWidth,
            child: sidePanel!,
          ),
          const VerticalDivider(width: 1),
          Expanded(
            child: contentPanel ?? const _EmptyContentPanel(),
          ),
        ],
      );
    }
    return mobile;
  }
}

/// 宽屏右侧空状态（未选中会话时显示）
class _EmptyContentPanel extends StatelessWidget {
  const _EmptyContentPanel();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('选择一个会话开始聊天', style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
