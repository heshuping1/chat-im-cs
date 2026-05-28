import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';

// ---------------------------------------------------------------------------
// UserPresence 实体
// ---------------------------------------------------------------------------

class UserPresence {
  final String userId;
  final bool isOnline;
  final String? customStatus;

  const UserPresence({
    required this.userId,
    required this.isOnline,
    this.customStatus,
  });

  UserPresence copyWith({
    String? userId,
    bool? isOnline,
    String? customStatus,
  }) {
    return UserPresence(
      userId: userId ?? this.userId,
      isOnline: isOnline ?? this.isOnline,
      customStatus: customStatus ?? this.customStatus,
    );
  }

  factory UserPresence.fromJson(Map<String, dynamic> json) {
    return UserPresence(
      userId: json['userId'] as String? ?? '',
      isOnline: json['isOnline'] as bool? ?? false,
      customStatus: json['customStatus'] as String?,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserPresence &&
          userId == other.userId &&
          isOnline == other.isOnline &&
          customStatus == other.customStatus;

  @override
  int get hashCode =>
      userId.hashCode ^ isOnline.hashCode ^ customStatus.hashCode;
}

// ---------------------------------------------------------------------------
// PresenceNotifier
// ---------------------------------------------------------------------------

class PresenceNotifier extends StateNotifier<Map<String, UserPresence>> {
  final Ref _ref;

  PresenceNotifier(this._ref) : super({});

  /// Gateway 推送：更新或插入用户在线状态
  void updatePresence(String userId, bool isOnline, String? customStatus) {
    state = {
      ...state,
      userId: UserPresence(
        userId: userId,
        isOnline: isOnline,
        customStatus: customStatus,
      ),
    };
  }

  /// 批量查询在线状态（POST /api/client/v1/presence/batch）
  Future<void> fetchBatch(List<String> userIds) async {
    if (userIds.isEmpty) return;
    try {
      final dio = _ref.read(dioProvider);
      final resp = await dio.post<Map<String, dynamic>>(
        '/api/client/v1/presence/batch',
        data: {'userIds': userIds},
      );
      final list = resp.data?['data'] as List<dynamic>? ?? [];
      final updates = <String, UserPresence>{};
      for (final item in list) {
        final p = UserPresence.fromJson(item as Map<String, dynamic>);
        updates[p.userId] = p;
      }
      if (updates.isNotEmpty) {
        state = {...state, ...updates};
      }
    } catch (_) {
      // 批量查询失败静默处理，不影响已有状态
    }
  }

  /// 查询单个用户在线状态（GET /api/client/v1/presence/{userId}）
  Future<void> fetchOne(String userId) async {
    try {
      final dio = _ref.read(dioProvider);
      final resp = await dio.get<Map<String, dynamic>>(
        '/api/client/v1/presence/$userId',
      );
      final data = resp.data?['data'] as Map<String, dynamic>?;
      if (data != null) {
        final p = UserPresence.fromJson(data);
        state = {...state, p.userId: p};
      }
    } catch (_) {}
  }

  /// 设置自定义状态（PUT /api/client/v1/presence/status）
  /// 成功后同步更新本地缓存，UI 立即响应
  Future<void> setCustomStatus(String userId, String? status) async {
    try {
      final dio = _ref.read(dioProvider);
      await dio.put<Map<String, dynamic>>(
        '/api/client/v1/presence/status',
        data: {'customStatus': status},
      );
      // 更新本地状态，UI 立即响应
      final current = state[userId];
      if (current != null) {
        state = {
          ...state,
          userId: current.copyWith(customStatus: status),
        };
      } else {
        state = {
          ...state,
          userId: UserPresence(
            userId: userId,
            isOnline: true,
            customStatus: status,
          ),
        };
      }
    } catch (_) {}
  }

  /// 获取指定用户的在线状态（不存在时返回 null）
  UserPresence? getPresence(String userId) => state[userId];
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/// 在线状态 Provider（按 userId 缓存）
final presenceProvider =
    StateNotifierProvider<PresenceNotifier, Map<String, UserPresence>>(
  (ref) => PresenceNotifier(ref),
);

/// 便捷 Provider：获取单个用户的在线状态
final userPresenceProvider =
    Provider.family<UserPresence?, String>((ref, userId) {
  return ref.watch(presenceProvider)[userId];
});
