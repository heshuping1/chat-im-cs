import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';

/// 当前空间的有效视图上下文。
///
/// 冷启动或快速进入首页时，currentSpace 可能先以 membershipRole=0 的占位值恢复；
/// authState.availableTenants 里通常已经有服务端返回的真实企业角色。角色化入口、
/// 通讯录和工作台都应使用这个 provider，避免所有者/管理员短暂落到普通成员视图。
final effectiveCurrentSpaceProvider = Provider<SpaceContext?>((ref) {
  final authState = ref.watch(authProvider).valueOrNull;
  if (authState?.status != AuthStatus.authenticated) return null;

  final space = ref.watch(currentSpaceProvider);
  if (space == null) return null;

  int? tenantRole;
  for (final tenant in authState?.availableTenants ?? const []) {
    if (tenant.tenantId == space.spaceId) {
      tenantRole = tenant.membershipRole;
      break;
    }
  }

  if (tenantRole != null && tenantRole > space.membershipRole) {
    return space.copyWith(membershipRole: tenantRole);
  }
  return space;
});
