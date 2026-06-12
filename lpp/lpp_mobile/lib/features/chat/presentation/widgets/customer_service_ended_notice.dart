import 'package:flutter/material.dart';

class CustomerServiceEndedNotice extends StatelessWidget {
  final String? statusLabel;
  final VoidCallback? onRefresh;
  final bool refreshing;

  const CustomerServiceEndedNotice({
    super.key,
    this.statusLabel,
    this.onRefresh,
    this.refreshing = false,
  });

  @override
  Widget build(BuildContext context) {
    final status = statusLabel?.trim();
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: const BoxDecoration(
          color: Color(0xFFF7F8FA),
          border: Border(top: BorderSide(color: Color(0xFFE5E6EB))),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.check_circle_outline,
                  size: 16,
                  color: Color(0xFF86909C),
                ),
                const SizedBox(width: 6),
                Text(
                  status == null || status.isEmpty ? '会话已结束' : status,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF86909C),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            const Text(
              '历史记录已保留，客户继续对话后会恢复接待。',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Color(0xFF86909C)),
            ),
            if (onRefresh != null) ...[
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: refreshing ? null : onRefresh,
                icon: refreshing
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.refresh, size: 16),
                label: const Text('刷新状态'),
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF165DFF),
                  minimumSize: const Size(0, 32),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
