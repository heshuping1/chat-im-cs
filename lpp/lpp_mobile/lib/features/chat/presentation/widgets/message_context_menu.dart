import 'package:flutter/material.dart';

/// 消息长按上下文菜单
/// 严格对照 figma MessageContextMenu.tsx
/// 背景色 #4A4A4A，白色文字，危险操作红色
class MessageContextMenu extends StatelessWidget {
  final bool isOpen;
  final VoidCallback onClose;
  final Offset position;
  final VoidCallback onCopy;
  final VoidCallback onDelete;
  final VoidCallback onForward;
  final VoidCallback onFavorite;
  final VoidCallback onReply;
  final VoidCallback onTranslate;
  final VoidCallback onMultiSelect;
  final VoidCallback? onConvertVoiceToText;
  final VoidCallback? onRecall;
  final bool showTranslate;
  final bool showConvertVoiceToText;
  /// 是否显示撤回：自己发送 && 发送时间在2分钟内
  final bool showRecall;

  const MessageContextMenu({
    super.key,
    required this.isOpen,
    required this.onClose,
    required this.position,
    required this.onCopy,
    required this.onDelete,
    required this.onForward,
    required this.onFavorite,
    required this.onReply,
    required this.onTranslate,
    required this.onMultiSelect,
    this.onConvertVoiceToText,
    this.onRecall,
    required this.showTranslate,
    required this.showConvertVoiceToText,
    this.showRecall = false,
  });

  @override
  Widget build(BuildContext context) {
    if (!isOpen) return const SizedBox.shrink();

    final screenSize = MediaQuery.of(context).size;
    const menuWidth = 160.0;
    const itemHeight = 48.0;

    // 构建菜单项列表（对照 figma 顺序）
    final items = <_MenuItem>[
      _MenuItem(icon: Icons.check_box_outlined, label: '多选', onTap: onMultiSelect),
      _MenuItem(icon: Icons.reply_outlined, label: '引用', onTap: onReply),
      if (showConvertVoiceToText && onConvertVoiceToText != null)
        _MenuItem(icon: Icons.text_fields_outlined, label: '转文字', onTap: onConvertVoiceToText!),
      _MenuItem(icon: Icons.copy_outlined, label: '复制', onTap: onCopy),
      if (showTranslate)
        _MenuItem(icon: Icons.translate_outlined, label: '翻译', onTap: onTranslate),
      _MenuItem(icon: Icons.forward_outlined, label: '转发', onTap: onForward),
      _MenuItem(icon: Icons.star_outline, label: '收藏', onTap: onFavorite),
      if (showRecall && onRecall != null)
        _MenuItem(icon: Icons.undo_outlined, label: '撤回', onTap: onRecall!, danger: true),
      _MenuItem(icon: Icons.delete_outline, label: '删除', onTap: onDelete, danger: true),
    ];

    final menuHeight = items.length * itemHeight;

    // 计算菜单位置，避免超出屏幕
    // globalPosition 需要减去状态栏 + AppBar 高度转换为 Stack 内坐标
    final topOffset = MediaQuery.of(context).padding.top + kToolbarHeight;
    double left = position.dx;
    double top = position.dy - topOffset;

    if (left + menuWidth > screenSize.width - 16) {
      left = screenSize.width - menuWidth - 16;
    }
    if (left < 16) left = 16;
    if (top + menuHeight > screenSize.height - topOffset - 100) {
      top = position.dy - topOffset - menuHeight;
    }
    if (top < 8) top = 8;

    return Stack(
      children: [
        // 透明遮罩
        GestureDetector(
          onTap: onClose,
          behavior: HitTestBehavior.opaque,
          child: Container(color: Colors.transparent),
        ),
        // 菜单卡片
        Positioned(
          left: left,
          top: top,
          child: Material(
            color: Colors.transparent,
            child: Container(
              width: menuWidth,
              decoration: BoxDecoration(
                color: const Color(0xFF4A4A4A),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: items.map((item) => _MenuItemWidget(
                    item: item,
                    onClose: onClose,
                  )).toList(),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;

  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
  });
}

class _MenuItemWidget extends StatelessWidget {
  final _MenuItem item;
  final VoidCallback onClose;

  const _MenuItemWidget({required this.item, required this.onClose});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        item.onTap();
        onClose();
      },
      child: Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: [
            Icon(
              item.icon,
              size: 18,
              color: item.danger ? Colors.red.shade300 : Colors.white,
            ),
            const SizedBox(width: 12),
            Text(
              item.label,
              style: TextStyle(
                fontSize: 15,
                color: item.danger ? Colors.red.shade300 : Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
