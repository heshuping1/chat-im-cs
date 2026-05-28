import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/app/theme/theme.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/space/domain/entities/space_entity.dart';
import 'package:lpp_mobile/features/space/presentation/providers/spaces_provider.dart';
import 'package:lpp_mobile/shared/widgets/app_badge.dart';

/// 空间切换侧边栏
///
/// 垂直图标列表，宽度约 60dp。
/// - 每个空间图标 44×44，圆角 12
/// - 激活状态：左侧绿色竖条 + 浅绿背景
/// - 有未读消息：红色角标（AppBadge）
/// - 点击切换空间
class SpaceSidebar extends ConsumerWidget {
  const SpaceSidebar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final spacesAsync = ref.watch(spacesProvider);

    return Container(
      width: 60,
      color: const Color(0xFFF7F7F7),
      child: spacesAsync.when(
        loading: () => const Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
        error: (_, __) => const SizedBox.shrink(),
        data: (spaces) => ListView.builder(
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: spaces.length,
          itemBuilder: (context, index) {
            final space = spaces[index];
            return _SpaceSidebarItem(
              space: space,
              onTap: () => ref
                  .read(spacesProvider.notifier)
                  .switchSpace(space.spaceId)
                  .catchError((error) {
                if (context.mounted) {
                  AppToast.error(
                    context,
                    error.toString().replaceFirst('Exception: ', ''),
                  );
                }
              }),
            );
          },
        ),
      ),
    );
  }
}

class _SpaceSidebarItem extends StatelessWidget {
  final Space space;
  final VoidCallback onTap;

  const _SpaceSidebarItem({
    required this.space,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        height: 60,
        child: Stack(
          children: [
            // 激活状态：左侧绿色竖条
            if (space.isActive)
              Positioned(
                left: 0,
                top: 10,
                bottom: 10,
                child: Container(
                  width: 3,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

            // 空间图标（居中）
            Center(
              child: AppBadge(
                count: space.unreadCount,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: space.isActive
                        ? AppColors.primary.withValues(alpha: 0.15)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: _SpaceIcon(space: space),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 空间图标（Logo 或首字母）
class _SpaceIcon extends StatelessWidget {
  final Space space;

  const _SpaceIcon({required this.space});

  @override
  Widget build(BuildContext context) {
    if (space.logoUrl != null && space.logoUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: AuthNetworkImage(
          url: space.logoUrl!,
          width: 44,
          height: 44,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _FallbackIcon(space: space),
        ),
      );
    }
    return _FallbackIcon(space: space);
  }
}

class _FallbackIcon extends StatelessWidget {
  final Space space;

  const _FallbackIcon({required this.space});

  @override
  Widget build(BuildContext context) {
    final isPersonal = space.isPersonal;
    final label = space.name.isNotEmpty ? space.name[0].toUpperCase() : '企';

    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        gradient: isPersonal
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF07C160), Color(0xFF00A854)],
              )
            : const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
              ),
        borderRadius: BorderRadius.circular(10),
      ),
      alignment: Alignment.center,
      child: isPersonal
          ? Icon(Icons.person,
              color: Theme.of(context).colorScheme.surface, size: 24)
          : Text(
              label,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Theme.of(context).colorScheme.surface,
              ),
            ),
    );
  }
}
