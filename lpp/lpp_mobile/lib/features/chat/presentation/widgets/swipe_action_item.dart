import 'package:flutter/material.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';

/// 左滑操作菜单 Widget，参考微信交互
/// 左滑超过 40dp 后 snap 展开，露出三个操作按钮
class SwipeActionItem extends StatefulWidget {
  final Widget child;
  final Conversation conversation;
  final String spaceId;

  /// 菜单展开时通知父级关闭其他菜单
  final VoidCallback? onMenuOpened;

  /// 操作回调
  final Future<void> Function() onDelete;
  final Future<void> Function(bool pinned) onTogglePin;
  final Future<void> Function(bool muted) onToggleMute;
  final Future<void> Function(bool markAsRead) onToggleRead;

  const SwipeActionItem({
    super.key,
    required this.child,
    required this.conversation,
    required this.spaceId,
    this.onMenuOpened,
    required this.onDelete,
    required this.onTogglePin,
    required this.onToggleMute,
    required this.onToggleRead,
  });

  @override
  State<SwipeActionItem> createState() => SwipeActionItemState();
}

class SwipeActionItemState extends State<SwipeActionItem>
    with SingleTickerProviderStateMixin {
  static const double _buttonWidth = 72.0;
  static const int _buttonCount = 4;
  static const double _totalWidth = _buttonWidth * _buttonCount; // 216
  static const double _triggerThreshold = 40.0;

  late AnimationController _controller;
  late Animation<double> _animation;
  bool _isOpen = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// 关闭菜单（供外部调用）
  void close() {
    if (_isOpen) {
      _controller.reverse();
      setState(() => _isOpen = false);
    }
  }

  void _open() {
    if (!_isOpen) {
      _controller.forward();
      setState(() => _isOpen = true);
      widget.onMenuOpened?.call();
    }
  }

  void _onHorizontalDragUpdate(DragUpdateDetails details) {
    // 向左滑动（delta.dx < 0）
    if (details.delta.dx < 0) {
      final newValue =
          (_controller.value - details.delta.dx / _totalWidth).clamp(0.0, 1.0);
      _controller.value = newValue;
    } else if (_isOpen) {
      // 向右滑动时收起
      final newValue =
          (_controller.value - details.delta.dx / _totalWidth).clamp(0.0, 1.0);
      _controller.value = newValue;
    }
  }

  void _onHorizontalDragEnd(DragEndDetails details) {
    final offset = _controller.value * _totalWidth;
    if (offset > _triggerThreshold) {
      _open();
    } else {
      close();
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = widget.conversation.unreadCount > 0;
    return GestureDetector(
      onHorizontalDragUpdate: _onHorizontalDragUpdate,
      onHorizontalDragEnd: _onHorizontalDragEnd,
      onTap: _isOpen ? close : null,
      child: ClipRect(
        child: Stack(
          children: [
            // 操作按钮区域（右侧，随动画滑入）
            Positioned.fill(
              child: Align(
                alignment: Alignment.centerRight,
                child: AnimatedBuilder(
                  animation: _animation,
                  builder: (context, _) {
                    final width = _animation.value * _totalWidth;
                    return SizedBox(
                      width: width,
                      child: Row(
                        children: [
                          // 标记已读/未读（蓝色）
                          _ActionButton(
                            color: const Color(0xFF3B82F6),
                            icon: hasUnread
                                ? Icons.mark_chat_read_outlined
                                : Icons.mark_chat_unread_outlined,
                            label: hasUnread ? '标已读' : '标未读',
                            onTap: () async {
                              close();
                              await widget.onToggleRead(hasUnread);
                            },
                          ),
                          // 置顶/取消置顶（灰色）
                          _ActionButton(
                            color: const Color(0xFF6B7280),
                            icon: widget.conversation.isPinned
                                ? Icons.push_pin_outlined
                                : Icons.push_pin,
                            label: widget.conversation.isPinned ? '取消置顶' : '置顶',
                            onTap: () async {
                              close();
                              await widget
                                  .onTogglePin(!widget.conversation.isPinned);
                            },
                          ),
                          // 免打扰/取消免打扰（橙色）
                          _ActionButton(
                            color: const Color(0xFFF59E0B),
                            icon: widget.conversation.isMuted
                                ? Icons.notifications_outlined
                                : Icons.notifications_off_outlined,
                            label: widget.conversation.isMuted ? '提醒' : '免打扰',
                            onTap: () async {
                              close();
                              await widget
                                  .onToggleMute(!widget.conversation.isMuted);
                            },
                          ),
                          // 删除（红色）
                          _ActionButton(
                            color: const Color(0xFFEF4444),
                            icon: Icons.delete_outline,
                            label: '删除',
                            onTap: () async {
                              close();
                              await widget.onDelete();
                            },
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),

            // 主内容（随动画向左偏移）
            AnimatedBuilder(
              animation: _animation,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(-_animation.value * _totalWidth, 0),
                  child: child,
                );
              },
              child: Container(
                color: Theme.of(context).colorScheme.surface,
                child: widget.child,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionButton({
    required this.color,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          color: color,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  color: Theme.of(context).colorScheme.surface, size: 22),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.surface,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
