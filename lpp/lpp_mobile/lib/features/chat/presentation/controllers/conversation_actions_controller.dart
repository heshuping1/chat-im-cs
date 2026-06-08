import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_draft_local_store.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/chat_draft_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';

final conversationActionsControllerProvider =
    Provider<ConversationActionsController>(
  (ref) => ConversationActionsController(ref),
);

class ConversationActionsController {
  final Ref _ref;

  const ConversationActionsController(this._ref);

  Future<void> setPinned(
    String conversationId, {
    required bool pinned,
    required bool isGroup,
    String? spaceId,
  }) async {
    await _runNotifierOrRemote(
      spaceId: spaceId,
      conversationId: conversationId,
      notifierAction: (notifier) => notifier.togglePin(conversationId, pinned),
      remoteAction: () => _putPersonalSetting(
        conversationId,
        isGroup: isGroup,
        path: 'pin',
        body: {'pinned': pinned},
      ),
    );
  }

  Future<void> setMuted(
    String conversationId, {
    required bool muted,
    required bool isGroup,
    String? spaceId,
  }) async {
    await _runNotifierOrRemote(
      spaceId: spaceId,
      conversationId: conversationId,
      notifierAction: (notifier) => notifier.toggleMute(conversationId, muted),
      remoteAction: () => _putPersonalSetting(
        conversationId,
        isGroup: isGroup,
        path: 'mute',
        body: {'muted': muted},
      ),
    );
  }

  Future<void> markRead(
    String conversationId, {
    required bool isGroup,
    required int readSeq,
    String? spaceId,
  }) async {
    final resolvedSpaceId = _resolveSpaceId(spaceId);
    if (resolvedSpaceId.isNotEmpty) {
      await _ref
          .read(conversationsProvider(resolvedSpaceId).notifier)
          .markRead(conversationId, isGroup, readSeq);
      return;
    }
    final dio = _ref.read(dioProvider);
    await dio.post<Map<String, dynamic>>(
      isGroup
          ? '/api/client/v1/groups/$conversationId/read'
          : '/api/client/v1/direct-chats/$conversationId/read',
      data: {'readSeq': readSeq},
    );
  }

  Future<void> recallMessage(String messageId) async {
    final dio = _ref.read(dioProvider);
    final response = await dio.post<Map<String, dynamic>>(
      '/api/client/v1/messages/$messageId/recall',
    );
    _throwIfApiFailed(response.data);
  }

  Future<void> deleteMessage(String messageId) async {
    final dio = _ref.read(dioProvider);
    final response = await dio.post<Map<String, dynamic>>(
      '/api/client/v1/messages/$messageId/delete',
    );
    _throwIfApiFailed(response.data);
  }

  Future<void> addFavorite({
    required String messageId,
    required String conversationId,
  }) async {
    final dio = _ref.read(dioProvider);
    final response = await dio.post<Map<String, dynamic>>(
      '/api/client/v1/favorites',
      data: {
        'messageId': messageId,
        'conversationId': conversationId,
      },
    );
    _throwIfApiFailed(response.data);
    if (!_hasPayloadValue(response.data, const ['favoriteId', 'messageId'])) {
      throw StateError('Favorite response missing identifier');
    }
  }

  Future<String?> voiceToText(String messageId) async {
    final dio = _ref.read(dioProvider);
    final response = await dio.post<Map<String, dynamic>>(
      '/api/client/v1/messages/voice-to-text',
      data: {'messageId': messageId},
    );
    _throwIfApiFailed(response.data);
    return _extractTextResult(response.data);
  }

  Future<void> forwardMessages({
    required List<String> sourceMessageIds,
    required String targetConversationId,
  }) async {
    for (final sourceMessageId in sourceMessageIds) {
      try {
        await _forwardSingleMessage(sourceMessageId, targetConversationId);
      } on _ForwardUnconfirmedException {
        rethrow;
      } catch (_) {
        await _forwardMessageBatch(
            <String>[sourceMessageId], targetConversationId);
      }
    }
  }

  Future<void> _forwardSingleMessage(
    String sourceMessageId,
    String targetConversationId,
  ) async {
    final dio = _ref.read(dioProvider);
    final response = await dio.post<Map<String, dynamic>>(
      '/api/client/v1/messages/forward',
      data: {
        'sourceMessageId': sourceMessageId,
        'targetConversationId': targetConversationId,
        'clientMsgId': _forwardClientMsgId(sourceMessageId),
      },
    );
    _throwIfApiFailed(response.data);
    final forwardedIds = _forwardedMessageIds(response.data)
        .where((id) => id != sourceMessageId);
    if (forwardedIds.isEmpty) {
      throw const _ForwardUnconfirmedException();
    }
  }

  Future<void> _forwardMessageBatch(
    List<String> sourceMessageIds,
    String targetConversationId,
  ) async {
    final dio = _ref.read(dioProvider);
    final response = await dio.post<Map<String, dynamic>>(
      '/api/client/v1/messages/forward',
      data: {
        'messageIds': sourceMessageIds,
        'targetConversationIds': [targetConversationId],
      },
    );
    _throwIfApiFailed(response.data);
    final sourceIdSet = sourceMessageIds.toSet();
    final forwardedIds = _forwardedMessageIds(response.data)
        .where((id) => !sourceIdSet.contains(id))
        .toSet();
    if (forwardedIds.length < sourceMessageIds.length) {
      throw const _ForwardUnconfirmedException();
    }
  }

  void markUnreadLocally(
    String conversationId, {
    String? spaceId,
  }) {
    final resolvedSpaceId = _resolveSpaceId(spaceId);
    if (resolvedSpaceId.isEmpty) return;
    _ref
        .read(conversationsProvider(resolvedSpaceId).notifier)
        .markUnreadLocally(conversationId);
  }

  Future<void> deleteConversation(
    Conversation conversation, {
    String? spaceId,
  }) async {
    final resolvedSpaceId = _resolveSpaceId(spaceId);
    if (resolvedSpaceId.isNotEmpty) {
      await _ref
          .read(conversationsProvider(resolvedSpaceId).notifier)
          .hideConversationLocally(conversation.conversationId);
    }
    await clearDraft(
      conversation.conversationId,
      isGroup: isGroupConversation(conversation),
    );
  }

  Future<void> clearDraft(
    String conversationId, {
    required bool isGroup,
  }) async {
    await saveDraft(conversationId, isGroup: isGroup, text: '');
  }

  Future<void> saveDraft(
    String conversationId, {
    required bool isGroup,
    required String text,
  }) async {
    final space = _ref.read(currentSpaceProvider);
    final spaceId = space?.spaceId ?? '';
    final userId = space?.userId ?? '';
    if (spaceId.isNotEmpty && userId.isNotEmpty) {
      await const ChatDraftLocalStore().saveDraft(
        spaceId: spaceId,
        userId: userId,
        conversationId: conversationId,
        text: text,
      );
      _ref.invalidate(chatDraftProvider((spaceId, userId, conversationId)));
    }

    final dio = _ref.read(dioProvider);
    try {
      final path = isGroup
          ? '/api/client/v1/groups/$conversationId/draft'
          : '/api/client/v1/direct-chats/$conversationId/draft';
      if (text.trim().isEmpty) {
        await dio.delete<Map<String, dynamic>>(path);
      } else {
        await dio.put<Map<String, dynamic>>(
          path,
          data: {'draftText': text},
        );
      }
    } catch (_) {
      // 草稿是辅助状态，失败不阻断会话主流程。
    }
  }

  Future<void> _runNotifierOrRemote({
    required String? spaceId,
    required String conversationId,
    required Future<void> Function(ConversationsNotifier notifier)
        notifierAction,
    required Future<void> Function() remoteAction,
  }) async {
    final resolvedSpaceId = _resolveSpaceId(spaceId);
    if (resolvedSpaceId.isEmpty) {
      await remoteAction();
      return;
    }
    try {
      await notifierAction(
        _ref.read(conversationsProvider(resolvedSpaceId).notifier),
      );
    } on StateError {
      await remoteAction();
    }
  }

  Future<void> _putPersonalSetting(
    String conversationId, {
    required bool isGroup,
    required String path,
    required Map<String, Object?> body,
  }) async {
    final dio = _ref.read(dioProvider);
    await dio.put<Map<String, dynamic>>(
      isGroup
          ? '/api/client/v1/groups/$conversationId/$path'
          : '/api/client/v1/direct-chats/$conversationId/$path',
      data: body,
    );
  }

  static String _forwardClientMsgId(String sourceMessageId) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final hash = sourceMessageId.hashCode.toUnsigned(32).toRadixString(16);
    return 'fwd_${timestamp}_$hash';
  }

  static List<String> _forwardedMessageIds(Map<String, dynamic>? body) {
    if (body == null) return const <String>[];
    final payload = body.containsKey('data') ? body['data'] : body;
    final ids = <String>[];

    void collect(dynamic value) {
      if (value is String && value.isNotEmpty) {
        ids.add(value);
      } else if (value is Map) {
        for (final key in const [
          'messageId',
          'forwardedMessageId',
          'newMessageId',
        ]) {
          final id = value[key];
          if (id is String && id.isNotEmpty) ids.add(id);
        }
        for (final key in const [
          'messageIds',
          'forwardedMessageIds',
          'items',
          'results',
          'messages',
        ]) {
          collect(value[key]);
        }
      } else if (value is Iterable) {
        for (final item in value) {
          collect(item);
        }
      }
    }

    collect(payload);
    return ids.toSet().toList(growable: false);
  }

  static bool _hasPayloadValue(Map<String, dynamic>? body, List<String> keys) {
    if (body == null) return false;
    final payload = body.containsKey('data') ? body['data'] : body;

    bool scan(Object? value) {
      if (value is Map) {
        for (final key in keys) {
          final item = value[key];
          if (item != null && item.toString().isNotEmpty) return true;
        }
        return value.values.any(scan);
      }
      if (value is Iterable) return value.any(scan);
      return false;
    }

    return scan(payload);
  }

  static String? _extractTextResult(Map<String, dynamic>? body) {
    final data = body?['data'];
    if (data is String && data.trim().isNotEmpty) return data.trim();
    if (data is Map) {
      for (final key in const ['text', 'transcript', 'result']) {
        final value = data[key];
        if (value is String && value.trim().isNotEmpty) return value.trim();
      }
    }
    return null;
  }

  static void _throwIfApiFailed(Map<String, dynamic>? body) {
    final code = body?['code'];
    if (code == null || code == 'OK') return;
    throw StateError(body?['message']?.toString() ?? code.toString());
  }

  String _resolveSpaceId(String? spaceId) {
    if (spaceId?.isNotEmpty == true) return spaceId!;
    final space = _ref.read(currentSpaceProvider);
    return space?.spaceId ?? '';
  }

  static bool isGroupConversation(Conversation conversation) {
    return conversation.type == ConversationType.group ||
        conversation.type == ConversationType.tempSession;
  }
}

class _ForwardUnconfirmedException implements Exception {
  const _ForwardUnconfirmedException();
}
