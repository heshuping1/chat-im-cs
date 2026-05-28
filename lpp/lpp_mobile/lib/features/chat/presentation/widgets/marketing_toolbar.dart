import 'package:flutter/material.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';

/// 营销工具栏（仅员工端显示）
/// 参考 figma MarketingToolbar.tsx
class MarketingToolbar extends StatelessWidget {
  final void Function(String toolId) onToolClick;

  const MarketingToolbar({super.key, required this.onToolClick});

  static const _tools = [
    _Tool('product', '产品卡片', Icons.shopping_bag_outlined),
    _Tool('coupon', '活动优惠券', Icons.card_giftcard_outlined),
    _Tool('survey', '调研问卷', Icons.assignment_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(top: BorderSide(color: Color(0xFFE5E7EB))),
      ),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            ..._tools.map((tool) => Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child:
                      _ToolChip(tool: tool, onTap: () => onToolClick(tool.id)),
                )),
            // 更多按钮
            GestureDetector(
              onTap: () => AppToast.comingSoon(context, '更多营销工具'),
              child: Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: Color(0xFFE6F7F2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.more_horiz,
                    size: 18, color: Color(0xFF00B27A)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Tool {
  final String id;
  final String name;
  final IconData icon;

  const _Tool(this.id, this.name, this.icon);
}

class _ToolChip extends StatelessWidget {
  final _Tool tool;
  final VoidCallback onTap;

  const _ToolChip({required this.tool, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFE6F7F2),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(tool.icon, size: 16, color: const Color(0xFF00B27A)),
            const SizedBox(width: 6),
            Text(tool.name,
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF00B27A))),
          ],
        ),
      ),
    );
  }
}
