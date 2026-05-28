import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/database/app_database.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';

/// SecureStorageService Provider（供其他 Provider 使用）
final secureStorageProvider = Provider<SecureStorageService>(
  (ref) => SecureStorageServiceImpl(),
);

/// 当前激活空间的 Provider
final currentSpaceProvider = NotifierProvider<SpaceManager, SpaceContext?>(
  SpaceManager.new,
);

/// 全局 token 持有者，供 TokenInterceptor 直接读取（无 Provider 依赖，避免循环）
class GlobalTokenHolder {
  String? accessToken;
  static final instance = GlobalTokenHolder._();
  GlobalTokenHolder._();
}

class SpaceManager extends Notifier<SpaceContext?> {
  @override
  SpaceContext? build() => null; // 初始为 null，登录后设置

  /// 设置当前空间（登录成功后调用，或启动时恢复）
  /// 注意：此方法不持久化 active_space_id，避免覆盖用户的空间选择
  void setSpace(SpaceContext context) {
    // 同步更新全局 token holder（在 state 变化前，确保 TokenInterceptor 能立即读到）
    GlobalTokenHolder.instance.accessToken = context.accessToken;
    state = context;
  }

  /// 切换空间（用户主动切换时调用，会持久化 active_space_id）
  Future<void> switchSpace(SpaceContext newContext) async {
    // 关闭旧空间的数据库连接（避免资源泄漏）
    final oldSpaceId = state?.spaceId;
    if (oldSpaceId != null && oldSpaceId != newContext.spaceId) {
      await AppDatabase.close(oldSpaceId);
    }
    GlobalTokenHolder.instance.accessToken = newContext.accessToken;
    state = newContext;
    await _persistActiveSpaceId(newContext.spaceId);
  }

  /// 清除空间（退出登录时调用）
  void clearSpace() {
    GlobalTokenHolder.instance.accessToken = null;
    state = null;
  }

  Future<void> _persistActiveSpaceId(String spaceId) async {
    final storage = ref.read(secureStorageProvider);
    await storage.write(SecureStorageService.activeSpaceIdKey, spaceId);
  }
}
