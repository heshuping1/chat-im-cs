import 'package:flutter/material.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';

/// 微信风格群头像
///
/// 布局规则（严格对照微信）：
/// - 1人：居中，占满整个区域
/// - 2人：左右各一，垂直居中
/// - 3人：上方 1 个居中，下方 2 个并排（三角形）
/// - 4人：2×2 宫格
/// - 5人：上方 2 个居中，下方 3 个并排
/// - 6人：2 行，每行 3 个
/// - 7人：上方 1 个居中，中间 3 个，下方 3 个
/// - 8人：上方 2 个居中，中间 3 个，下方 3 个
/// - 9人及以上：3×3 宫格，只显示前 9 个
class GroupAvatar extends StatelessWidget {
  final List<String?> memberAvatarUrls;
  final List<String> memberNames;
  final double size;
  final double borderRadius;

  const GroupAvatar({
    super.key,
    required this.memberAvatarUrls,
    required this.memberNames,
    this.size = 48,
    this.borderRadius = 10,
  });

  @override
  Widget build(BuildContext context) {
    final count = _effectiveCount();

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFFEDEDED),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: count == 0 ? _emptyPlaceholder() : _buildLayout(count),
      ),
    );
  }

  int _effectiveCount() {
    final urlCount = memberAvatarUrls.length;
    final nameCount = memberNames.length;
    final count = urlCount > nameCount ? urlCount : nameCount;
    return count.clamp(0, 9);
  }

  Widget _emptyPlaceholder() {
    return Container(
      color: const Color(0xFFEDEDED),
      child: Icon(
        Icons.group,
        size: size * 0.55,
        color: const Color(0xFF1D2129).withValues(alpha: 0.5),
      ),
    );
  }

  Widget _buildLayout(int count) {
    // 微信的布局：根据人数决定每行的格子数
    final rows = _rowsForCount(count);
    final gap = size * 0.012;
    final padding = size * 0.045;
    final available = size - padding * 2;

    // 最大列数（用于计算单元格大小）
    final maxCols = rows.reduce((a, b) => a > b ? a : b);
    final cellSize = (available - gap * (maxCols - 1)) / maxCols;

    int idx = 0;
    final rowWidgets = <Widget>[];

    for (int r = 0; r < rows.length; r++) {
      final cols = rows[r];
      final rowItems = <Widget>[];

      for (int c = 0; c < cols; c++) {
        if (idx < count) {
          rowItems.add(_MiniAvatar(
            url: idx < memberAvatarUrls.length ? memberAvatarUrls[idx] : null,
            name: idx < memberNames.length ? memberNames[idx] : '',
            size: cellSize,
          ));
          if (c < cols - 1) rowItems.add(SizedBox(width: gap));
          idx++;
        }
      }

      rowWidgets.add(Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: rowItems,
      ));
      if (r < rows.length - 1) rowWidgets.add(SizedBox(height: gap));
    }

    return Padding(
      padding: EdgeInsets.all(padding),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: rowWidgets,
      ),
    );
  }

  /// 微信每行格子数规则
  List<int> _rowsForCount(int count) {
    switch (count) {
      case 1:
        return [1];
      case 2:
        return [2];
      case 3:
        return [1, 2];
      case 4:
        return [2, 2];
      case 5:
        return [2, 3];
      case 6:
        return [3, 3];
      case 7:
        return [1, 3, 3];
      case 8:
        return [2, 3, 3];
      case 9:
        return [3, 3, 3];
      default:
        return [3, 3, 3];
    }
  }
}

/// 宫格内的单个小头像
class _MiniAvatar extends StatelessWidget {
  final String? url;
  final String name;
  final double size;

  const _MiniAvatar(
      {required this.url, required this.name, required this.size});

  @override
  Widget build(BuildContext context) {
    final radius = size * 0.04;
    if (url != null && url!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: AuthNetworkImage(
          url: url!,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _fallback(size, radius),
        ),
      );
    }
    return _fallback(size, radius);
  }

  Widget _fallback(double size, double radius) {
    final initial = name.isNotEmpty ? name.characters.first.toUpperCase() : '';
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF00B27A), Color(0xFF00D68F)],
        ),
        borderRadius: BorderRadius.circular(radius),
      ),
      child: Center(
        child: initial.isEmpty
            ? Icon(Icons.person, size: size * 0.48, color: Colors.white)
            : Text(
                initial,
                style: TextStyle(
                  fontSize: size * 0.42,
                  fontWeight: FontWeight.w500,
                  color: Colors.white,
                ),
              ),
      ),
    );
  }
}
