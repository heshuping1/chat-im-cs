import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/app/router/router.dart';
import 'package:lpp_mobile/app/theme/theme.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';

class TenantSelectPage extends ConsumerWidget {
  const TenantSelectPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    ref.listen<AsyncValue<AuthState>>(authProvider, (_, next) {
      next.whenOrNull(
        data: (state) {
          if (state.status == AuthStatus.authenticated) {
            context.go(AppRoutes.home);
          } else if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error!)),
            );
          }
        },
        error: (e, _) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString())),
          );
        },
      );
    });

    final tenants = authState.valueOrNull?.availableTenants ?? [];
    final isLoading = authState.isLoading;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('选择组织'),
        backgroundColor: AppColors.surface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => context.go(AppRoutes.login),
        ),
      ),
      body: isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : tenants.isEmpty
              ? _buildEmpty()
              : _buildTenantList(context, ref, tenants),
    );
  }

  Widget _buildEmpty() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.business_outlined, size: 64, color: AppColors.disabled),
          SizedBox(height: 16),
          Text('暂无可用组织', style: AppTextStyles.bodySecondary),
          SizedBox(height: 8),
          Text('请联系管理员邀请您加入组织', style: AppTextStyles.caption),
        ],
      ),
    );
  }

  Widget _buildTenantList(
    BuildContext context,
    WidgetRef ref,
    List<TenantSummary> tenants,
  ) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: tenants.length + 1, // +1 for personal space entry
      separatorBuilder: (_, __) => const Divider(
        height: 0.5,
        indent: 72,
        color: AppColors.divider,
      ),
      itemBuilder: (context, index) {
        // 最后一项：进入个人空间
        if (index == tenants.length) {
          return _PersonalSpaceItem(
            onTap: () => ref.read(authProvider.notifier).selectPersonalSpace(),
          );
        }
        final tenant = tenants[index];
        return _TenantListItem(
          tenant: tenant,
          onTap: () => ref.read(authProvider.notifier).selectTenant(
                tenant.tenantId,
              ),
        );
      },
    );
  }
}

class _TenantListItem extends StatelessWidget {
  final TenantSummary tenant;
  final VoidCallback onTap;

  const _TenantListItem({required this.tenant, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        color: AppColors.surface,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            _buildAvatar(),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tenant.tenantName,
                    style: AppTextStyles.body,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    tenant.roleLabel,
                    style: AppTextStyles.caption,
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: AppColors.textSecondary,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatar() {
    if (tenant.logoUrl != null && tenant.logoUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: AuthNetworkImage(
          url: tenant.logoUrl!,
          width: 44,
          height: 44,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _defaultAvatar(),
        ),
      );
    }
    return _defaultAvatar();
  }

  Widget _defaultAvatar() {
    final initial = tenant.tenantName.isNotEmpty
        ? tenant.tenantName[0].toUpperCase()
        : '?';
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(8),
      ),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _PersonalSpaceItem extends StatelessWidget {
  final VoidCallback onTap;

  const _PersonalSpaceItem({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        color: AppColors.surface,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              alignment: Alignment.center,
              child: const Icon(Icons.person_outline, color: AppColors.primary, size: 24),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('个人空间', style: AppTextStyles.body),
                  SizedBox(height: 2),
                  Text('好友聊天、个人收藏', style: AppTextStyles.caption),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textSecondary, size: 20),
          ],
        ),
      ),
    );
  }
}
