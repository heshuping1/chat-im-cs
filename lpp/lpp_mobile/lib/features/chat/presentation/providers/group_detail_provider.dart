import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/chat/domain/entities/group_entities.dart';

class GroupDetailNotifier extends StateNotifier<AsyncValue<GroupDetailEntity>> {
  final Ref ref;
  final String groupId;

  GroupDetailNotifier(this.ref, this.groupId)
      : super(const AsyncValue.loading()) {
    refresh(showLoading: true);
  }

  Future<void> refresh({bool showLoading = false}) async {
    final previous = state;
    if (showLoading || !previous.hasValue) {
      state = const AsyncValue.loading();
    }
    try {
      final space = ref.read(currentSpaceProvider);
      if (space == null || space.accessToken.isEmpty) {
        throw StateError('未登录');
      }

      final dio = ref.read(dioProvider);
      final response = await dio.get<Map<String, dynamic>>(
        '/api/client/v1/groups/$groupId',
      );
      final data = response.data?['data'] as Map<String, dynamic>? ?? {};
      state = AsyncValue.data(GroupDetailEntity.fromJson(data));
    } catch (error, stackTrace) {
      if (previous.hasValue) {
        state = previous;
        return;
      }
      state = AsyncValue.error(error, stackTrace);
    }
  }
}

final groupDetailProvider = StateNotifierProvider.family<GroupDetailNotifier,
    AsyncValue<GroupDetailEntity>, String>((ref, groupId) {
  ref.keepAlive();
  return GroupDetailNotifier(ref, groupId);
});
