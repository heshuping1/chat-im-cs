import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

/// 通用设置行（带箭头/值/开关）
class SettingTile extends StatelessWidget {
  final String label;
  final String? value;
  final Widget? leading;
  final bool showArrow;
  final VoidCallback? onTap;
  final Color? labelColor;

  const SettingTile({
    super.key,
    required this.label,
    this.value,
    this.leading,
    this.showArrow = true,
    this.onTap,
    this.labelColor,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            if (leading != null) ...[leading!, const SizedBox(width: 12)],
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style:
                    TextStyle(fontSize: 15, color: labelColor ?? cs.onSurface),
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: showArrow ? 132 : 110,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                mainAxisSize: MainAxisSize.max,
                children: [
                  if (value != null)
                    Flexible(
                      child: Text(
                        value!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.right,
                        style: TextStyle(
                          fontSize: 15,
                          color: cs.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                  if (showArrow) ...[
                    const SizedBox(width: 4),
                    Icon(
                      Icons.chevron_right,
                      color: cs.onSurface.withValues(alpha: 0.3),
                      size: 18,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SettingSwitchTile extends StatelessWidget {
  final String label;
  final String? description;
  final bool value;
  final ValueChanged<bool> onChanged;

  const SettingSwitchTile({
    super.key,
    required this.label,
    this.description,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(fontSize: 15, color: cs.onSurface)),
                if (description != null) ...[
                  const SizedBox(height: 2),
                  Text(description!,
                      style: TextStyle(
                          fontSize: 12,
                          color: cs.onSurface.withValues(alpha: 0.5))),
                ],
              ],
            ),
          ),
          CupertinoSwitch(
            value: value,
            onChanged: onChanged,
            activeTrackColor: const Color(0xFF00B27A),
          ),
        ],
      ),
    );
  }
}

/// 分组容器
class SettingGroup extends StatelessWidget {
  final List<Widget> children;
  final EdgeInsets margin;

  const SettingGroup({
    super.key,
    required this.children,
    this.margin = const EdgeInsets.symmetric(horizontal: 0),
  });

  @override
  Widget build(BuildContext context) {
    final dividerColor = Theme.of(context).dividerColor;
    return Container(
      margin: margin,
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        children: children.asMap().entries.map((e) {
          final isLast = e.key == children.length - 1;
          return Column(
            children: [
              e.value,
              if (!isLast) Divider(height: 1, indent: 16, color: dividerColor),
            ],
          );
        }).toList(),
      ),
    );
  }
}

/// 分组标题
class SettingSectionHeader extends StatelessWidget {
  final String label;

  const SettingSectionHeader({super.key, required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
      child: Text(label,
          style: TextStyle(
              fontSize: 13,
              color: Theme.of(context)
                  .colorScheme
                  .onSurface
                  .withValues(alpha: 0.5),
              fontWeight: FontWeight.w500)),
    );
  }
}

/// 通用页面 AppBar
PreferredSizeWidget buildSettingsAppBar(BuildContext context, String title) {
  final cs = Theme.of(context).colorScheme;
  return AppBar(
    backgroundColor: cs.surface,
    elevation: 0,
    surfaceTintColor: Colors.transparent,
    leading: IconButton(
      icon: Icon(Icons.arrow_back_ios, size: 20, color: cs.onSurface),
      onPressed: () => Navigator.of(context).maybePop(),
    ),
    title: Text(title,
        style: TextStyle(
            fontSize: 17, fontWeight: FontWeight.w600, color: cs.onSurface)),
    centerTitle: true,
  );
}
