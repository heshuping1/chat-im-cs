import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';

final directChatEntryControllerProvider = Provider<DirectChatEntryController>(
  (ref) => DirectChatEntryController(ref.watch(dioProvider)),
);

class DirectChatEntryController {
  final Dio _dio;

  const DirectChatEntryController(this._dio);

  Future<String> ensureConversationId({
    required bool isPendingDirectChat,
    required String activeConversationId,
    required String? peerUserId,
  }) async {
    if (!isPendingDirectChat) return activeConversationId;
    final resolvedPeerUserId = peerUserId?.trim();
    if (resolvedPeerUserId == null || resolvedPeerUserId.isEmpty) {
      throw StateError('Missing peer user id');
    }
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/client/v1/direct-chats',
      data: {'peerUserId': resolvedPeerUserId},
    );
    final data = response.data?['data'];
    if (data is! Map) throw StateError('Missing direct chat id');
    final conversationId =
        data['conversationId'] as String? ?? data['chatId'] as String?;
    if (conversationId == null || conversationId.isEmpty) {
      throw StateError('Missing direct chat id');
    }
    return conversationId;
  }
}
