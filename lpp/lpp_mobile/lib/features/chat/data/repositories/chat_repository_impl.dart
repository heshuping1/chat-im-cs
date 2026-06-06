import 'package:lpp_mobile/features/chat/data/datasources/chat_local_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_remote_datasource.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation_page.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/filter_conversations.dart';

class ChatRepositoryImpl implements ChatRepository {
  final ChatRemoteDataSource _remote;
  final ChatLocalDataSource _local;
  final String spaceId;

  ChatRepositoryImpl({
    required ChatRemoteDataSource remote,
    required ChatLocalDataSource local,
    required this.spaceId,
  })  : _remote = remote,
        _local = local;

  // ---------------------------------------------------------------------------
  // Conversations
  // ---------------------------------------------------------------------------

  @override
  Future<ConversationsPage> getConversations({
    String? cursor,
    int limit = 50,
  }) async {
    try {
      final page = await _remote.getConversations(cursor: cursor, limit: limit);
      final visibleItems = await _homeConversations(
        await _preserveLocalSelfReadState(page.items),
      );
      if (cursor == null) {
        await _local.cacheConversations(spaceId, visibleItems);
      }
      return ConversationsPage(
          items: visibleItems, nextCursor: page.nextCursor);
    } catch (_) {
      final cached = await _local.getCachedConversations(spaceId);
      if (cached != null) {
        return ConversationsPage(items: await _homeConversations(cached));
      }
      rethrow;
    }
  }

  /// 读取本地缓存（立即返回，不阻塞）
  Future<List<Conversation>?> getCachedConversations() async {
    final cached = await _local.getConversations(spaceId);
    return _homeConversations(cached);
  }

  /// 后台静默同步：拉取最新数据并 upsert 缓存，返回最新列表
  Future<List<Conversation>> syncConversationsFromRemote({
    int limit = 50,
  }) async {
    final page = await _remote.getConversations(limit: limit);
    final visibleItems = await _homeConversations(
      await _preserveLocalSelfReadState(page.items),
    );
    await _local.upsertConversations(spaceId, visibleItems);
    return visibleItems;
  }

  Future<List<Conversation>> _preserveLocalSelfReadState(
    List<Conversation> remoteItems,
  ) async {
    List<Conversation> cached;
    try {
      cached = await _local.getConversations(spaceId);
    } catch (_) {
      return remoteItems;
    }
    if (cached.isEmpty) return remoteItems;

    final cachedById = {
      for (final conversation in cached)
        conversation.conversationId: conversation,
    };

    return remoteItems.map((remote) {
      final local = cachedById[remote.conversationId];
      final localLast = local?.lastMessage;
      final remoteWithLocalMention = _preserveLocalLastMessageMentions(
        remote,
        local,
      );
      if (local == null ||
          localLast == null ||
          remoteWithLocalMention.unreadCount <= 0 ||
          !_isSelfLastMessage(localLast) ||
          !_isSameLastMessage(local, remoteWithLocalMention)) {
        return remoteWithLocalMention;
      }

      final lastSeq = remoteWithLocalMention.lastMessageSeq > local.lastMessageSeq
          ? remoteWithLocalMention.lastMessageSeq
          : local.lastMessageSeq;
      final readSeq =
          remoteWithLocalMention.lastReadSeq > lastSeq
              ? remoteWithLocalMention.lastReadSeq
              : lastSeq;

      return remoteWithLocalMention.copyWith(
        lastMessage: localLast,
        lastMessageSeq: lastSeq,
        lastReadSeq: readSeq,
        unreadCount: 0,
      );
    }).toList();
  }

  bool _isSelfLastMessage(LastMessage message) {
    final direction =
        (message.direction ?? '').trim().toLowerCase().replaceAll('-', '_');
    return message.isSelf ||
        const {'out', 'outgoing', 'sent', 'self'}.contains(direction);
  }

  Conversation _preserveLocalLastMessageMentions(
    Conversation remote,
    Conversation? local,
  ) {
    final remoteLast = remote.lastMessage;
    final localLast = local?.lastMessage;
    if (local == null ||
        remoteLast == null ||
        localLast == null ||
        remoteLast.mentions != null ||
        localLast.mentions == null ||
        !_isSameLastMessage(local, remote)) {
      return remote;
    }
    return remote.copyWith(
      lastMessage: remoteLast.copyWith(mentions: localLast.mentions),
    );
  }

  bool _isSameLastMessage(Conversation local, Conversation remote) {
    final localLast = local.lastMessage;
    final remoteLast = remote.lastMessage;
    if (localLast == null || remoteLast == null) return false;
    if (localLast.messageId.isNotEmpty &&
        remoteLast.messageId.isNotEmpty &&
        localLast.messageId == remoteLast.messageId) {
      return true;
    }
    return local.lastMessageSeq > 0 &&
        remote.lastMessageSeq > 0 &&
        local.lastMessageSeq == remote.lastMessageSeq;
  }

  Future<List<Conversation>> _homeConversations(
    List<Conversation> conversations,
  ) async {
    for (final conversation
        in conversations.where((c) => c.type == ConversationType.tempSession)) {
      await _local.deleteConversation(spaceId, conversation.conversationId);
    }
    return filterHomeConversations(conversations);
  }

  /// 更新会话草稿
  Future<void> updateConversationDraft(
      String conversationId, String? draft) async {
    await _local.updateConversationDraft(spaceId, conversationId, draft);
  }

  @override
  Future<void> pinConversation(String conversationId, bool pinned) async {
    try {
      await _remote.pinDirectChat(conversationId, pinned);
    } catch (_) {
      await _remote.pinGroup(conversationId, pinned);
    }
  }

  Future<void> pinConversationByType(
      String conversationId, bool pinned, bool isGroup) async {
    if (isGroup) {
      await _remote.pinGroup(conversationId, pinned);
    } else {
      await _remote.pinDirectChat(conversationId, pinned);
    }
  }

  @override
  Future<void> muteConversation(String conversationId, bool muted) async {
    // 尝试单聊，失败则尝试群聊
    try {
      await _remote.muteDirectChat(conversationId, muted);
    } catch (_) {
      await _remote.muteGroup(conversationId, muted);
    }
  }

  Future<void> muteConversationByType(
      String conversationId, bool muted, bool isGroup) async {
    if (isGroup) {
      await _remote.muteGroup(conversationId, muted);
    } else {
      await _remote.muteDirectChat(conversationId, muted);
    }
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  @override
  Future<List<Message>> getMessages(
    String conversationId, {
    bool isGroup = false,
    int? beforeSeq,
    int limit = 50,
  }) async {
    try {
      final messages = isGroup
          ? await _remote.getGroupMessages(
              conversationId,
              beforeSeq: beforeSeq,
              limit: limit,
            )
          : await _remote.getDirectChatMessages(
              conversationId,
              beforeSeq: beforeSeq,
              limit: limit,
            );
      if (beforeSeq == null) {
        await _local.cacheMessages(spaceId, conversationId, messages);
      }
      return messages;
    } catch (_) {
      final cached = await _local.getCachedMessages(spaceId, conversationId);
      if (cached != null) return cached;
      rethrow;
    }
  }

  /// 读取本地缓存消息（立即返回，不阻塞）
  Future<List<Message>?> getCachedMessages(String conversationId) async {
    return _local.getCachedMessages(spaceId, conversationId);
  }

  /// 后台增量同步：只拉 seq > localMaxSeq 的新消息，upsert 写入缓存
  Future<List<Message>> syncMessagesFromRemote(
    String conversationId, {
    required bool isGroup,
  }) async {
    // 获取本地最大 seq 作为增量同步游标
    final localMaxSeq = await _local.getLocalMaxSeq(spaceId, conversationId);

    // 拉取最新一页
    final fresh = isGroup
        ? await _remote.getGroupMessages(conversationId, limit: 50)
        : await _remote.getDirectChatMessages(conversationId, limit: 50);

    if (fresh.isEmpty) return [];

    // 只取比本地更新的消息
    final newMsgs =
        fresh.where((m) => m.conversationSeq > localMaxSeq).toList();

    if (newMsgs.isNotEmpty) {
      await _local.upsertMessages(spaceId, conversationId, newMsgs);
    }

    return newMsgs;
  }

  /// 从本地缓存加载历史消息（向上翻页，本地优先）
  Future<List<Message>> getOlderMessagesFromCache(
    String conversationId, {
    required int beforeSeq,
  }) async {
    return _local.getMessages(spaceId, conversationId, beforeSeq: beforeSeq);
  }

  /// 从网络加载历史消息（本地没有时才调用）
  Future<List<Message>> getOlderMessagesFromRemote(
    String conversationId, {
    required bool isGroup,
    required int beforeSeq,
    int limit = 50,
  }) async {
    final messages = isGroup
        ? await _remote.getGroupMessages(conversationId,
            beforeSeq: beforeSeq, limit: limit)
        : await _remote.getDirectChatMessages(conversationId,
            beforeSeq: beforeSeq, limit: limit);

    if (messages.isNotEmpty) {
      await _local.upsertMessages(spaceId, conversationId, messages);
    }
    return messages;
  }

  @override
  Future<Message> sendMessage({
    required String conversationId,
    required bool isGroup,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
    List<Mention>? mentions,
  }) async {
    if (isGroup) {
      return _remote.sendGroupMessage(
        groupId: conversationId,
        clientMsgId: clientMsgId,
        type: type,
        body: body,
        replyToMessageId: replyToMessageId,
        mentions: mentions,
      );
    } else {
      return _remote.sendDirectChatMessage(
        chatId: conversationId,
        clientMsgId: clientMsgId,
        type: type,
        body: body,
        replyToMessageId: replyToMessageId,
      );
    }
  }

  @override
  Future<ScheduledMessage> createScheduledMessage({
    required String conversationId,
    required bool isGroup,
    required MessageType type,
    required MessageBody body,
    required DateTime scheduledAt,
    String? replyToMessageId,
  }) async {
    final dto = await _remote.createScheduledMessage(
      conversationId: conversationId,
      isGroup: isGroup,
      type: type,
      body: body,
      scheduledAt: scheduledAt,
      replyToMessageId: replyToMessageId,
    );
    return dto.toDomain();
  }

  @override
  Future<List<ScheduledMessage>> getScheduledMessages(
    String conversationId,
  ) async {
    final items = await _remote.getScheduledMessages(conversationId);
    return items.map((item) => item.toDomain()).toList(growable: false);
  }

  @override
  Future<void> cancelScheduledMessage(String scheduledMessageId) =>
      _remote.cancelScheduledMessage(scheduledMessageId);

  @override
  Future<MediaResource> uploadMedia(
    String filePath, {
    MediaUploadProgressCallback? onProgress,
  }) async {
    return _remote.uploadMedia(filePath, onProgress: onProgress);
  }

  @override
  Future<void> recallMessage(String messageId) async {
    await _remote.recallMessage(messageId);
  }

  @override
  Future<void> markRead(
      String conversationId, bool isGroup, int readSeq) async {
    if (isGroup) {
      await _remote.markGroupRead(conversationId, readSeq);
    } else {
      await _remote.markDirectChatRead(conversationId, readSeq);
    }
  }
}
