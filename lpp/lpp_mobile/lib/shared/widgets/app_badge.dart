import 'package:flutter/material.dart';

/// 未读数角标 Widget（会话列表和空间侧边栏复用）
///
/// 显示红色圆形角标，count > 99 显示 "99+"
/// count == 0 且 showZero == false 时不显示角标
class AppBadge extends StatelessWidget {
  final int count;
  final Widget child;
  final bool showZero;

  const AppBadge({
    super.key,
    required this.count,
    required this.child,
    this.showZero = false,
  });

  String get _label => count > 99 ? '99+' : '$count';

  bool get _visible => count > 0 || showZero;

  @override
  Widget build(BuildContext context) {
    if (!_visible) return child;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        child,
        Positioned(
          top: -4,
          right: -4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
            constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
            decoration: const BoxDecoration(
              color: Colors.red,
              borderRadius: BorderRadius.all(Radius.circular(9)),
            ),
            child: Text(
              _label,
              style: TextStyle(
                color: Theme.of(context).colorScheme.surface,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                height: 1.2,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ],
    );
  }
}
