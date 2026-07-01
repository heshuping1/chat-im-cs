import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:lpp_mobile/core/database/app_database.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_local_search_index.dart';
import 'package:lpp_mobile/features/chat/data/models/message_model.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:sqflite/sqflite.dart';

abstract class ChatLocalDataSource {
  // ── 旧方法（保持签名兼容）────────────────────────────────────────────────
  Future<List<Conversation>?> getCachedConversations(String spaceId);
  Future<void> cacheConversations(
      String spaceId, List<Conversation> conversations);
  Future<List<Message>?> getCachedMessages(
      String spaceId, String conversationId);
  Future<void> cacheMessages(
      String spaceId, String conversationId, List<Message> messages);
  Future<void> upsertMessage(
      String spaceId, String conversationId, Message message);
  Future<void> deleteMessage(
      String spaceId, String conversationId, String messageId);

  // ── 新增方法 ──────────────────────────────────────────────────────────────
  /// 分页查询消息（beforeSeq = null 时返回最新 limit 条）
  Future<List<Message>> getMessages(
    String spaceId,
    String conversationId, {
    int? beforeSeq,
    int limit = 50,
  });

  /// 批量 upsert 消息（INSERT OR REPLACE）
  Future<void> upsertMessages(
    String spaceId,
    String conversationId,
    List<Message> messages,
  );

  /// 获取本地最大 conversationSeq（增量同步游标）
  Future<int> getLocalMaxSeq(String spaceId, String conversationId);

  /// 获取会话列表（按 is_pinned DESC, last_activity_at DESC 排序）
  Future<List<Conversation>> getConversations(String spaceId);

  /// 批量 upsert 会话
  Future<void> upsertConversations(
      String spaceId, List<Conversation> conversations);

  /// 更新单个会话（WebSocket 新消息时调用）
  Future<void> upsertConversation(String spaceId, Conversation conversation);

  /// 根据一条消息更新会话摘要，同时保留原会话的标题、置顶、免打扰等属性。
  Future<void> updateConversationSummaryFromMessage(
    String spaceId, {
    required String conversationId,
    required ConversationType fallbackType,
    required Message message,
    bool isSelf = false,
  });

  /// 更新草稿
  Future<void> updateConversationDraft(
    String spaceId,
    String conversationId,
    String? draft,
  );

  /// 清除会话消息（用户主动清除聊天记录）
  Future<void> clearConversationMessages(String spaceId, String conversationId);

  /// 删除本地会话入口（不影响服务端群关系/好友关系）。
  Future<void> deleteConversation(String spaceId, String conversationId);

  /// 删除整个空间数据库（退出登录）
  Future<void> deleteDatabase(String spaceId);

  /// 仅更新会话的未读数（标记已读时调用，避免全量 upsert）
  Future<void> updateConversationUnreadCount(
      String spaceId, String conversationId, int unreadCount);

  /// 更新会话已读游标，可同时更新未读数。
  Future<void> updateConversationReadState(
    String spaceId,
    String conversationId, {
    required int readSeq,
    int? unreadCount,
  });

  /// 标记消息为已撤回（Gateway 推送 msg.recalled 时调用）
  Future<void> markMessageRecalled(
      String spaceId, String conversationId, String messageId);

  /// 按对端已读游标更新当前用户自己发送的消息。
  Future<void> markOwnMessagesReadByPeer(
    String spaceId,
    String conversationId, {
    required String currentUserId,
    required int readSeq,
  });
}

List<Message> sortMessagesForTimeline(Iterable<Message> messages) {
  return messages.toList()
    ..sort((a, b) => a.conversationSeq.compareTo(b.conversationSeq));
}

class ChatLocalDataSourceImpl implements ChatLocalDataSource {
  // ── 表名生成 ──────────────────────────────────────────────────────────────

  String _messageTable(String conversationId) {
    final sanitized = conversationId.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
    return 'messages_$sanitized';
  }

  Future<void> _ensureMessageTable(Database db, String conversationId) async {
    final table = _messageTable(conversationId);
    await db.execute('''
      CREATE TABLE IF NOT EXISTS $table (
        message_id              TEXT PRIMARY KEY,
        client_msg_id           TEXT,
        conversation_id         TEXT NOT NULL,
        conversation_seq        INTEGER NOT NULL,
        sender_user_id          TEXT NOT NULL,
        message_type            TEXT NOT NULL,
        body                    TEXT NOT NULL,
        is_recalled             INTEGER NOT NULL DEFAULT 0,
        sent_at                 INTEGER NOT NULL,
        reply_to_message_id     TEXT,
        forward_from_message_id TEXT,
        mentions                TEXT,
        status                  TEXT NOT NULL DEFAULT 'sent',
        translation             TEXT,
        read_count              INTEGER NOT NULL DEFAULT 0,
        is_read_by_peer         INTEGER NOT NULL DEFAULT 0,
        failure_reason          TEXT,
        is_self                 INTEGER NOT NULL DEFAULT 0
      )
    ''');
    await _ensureColumn(db, table, 'read_count', 'INTEGER NOT NULL DEFAULT 0');
    await _ensureColumn(
        db, table, 'is_read_by_peer', 'INTEGER NOT NULL DEFAULT 0');
    await _ensureColumn(db, table, 'failure_reason', 'TEXT');
    await _ensureColumn(db, table, 'is_self', 'INTEGER NOT NULL DEFAULT 0');
    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_${table}_seq
      ON $table (conversation_seq)
    ''');
    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_${table}_client_msg_id
      ON $table (client_msg_id)
    ''');
  }

  // ── 序列化：消息 ──────────────────────────────────────────────────────────

  Map<String, dynamic> _messageToRow(Message m) {
    return {
      'message_id': m.messageId,
      'client_msg_id': m.clientMsgId,
      'conversation_id': m.conversationId,
      'conversation_seq': m.conversationSeq,
      'sender_user_id': m.senderUserId,
      'message_type': MessageModel.toJson(m)['messageType'] as String,
      'body': jsonEncode(m.body.toLocalJson()),
      'is_recalled': m.isRecalled ? 1 : 0,
      'sent_at': m.sentAt.millisecondsSinceEpoch,
      'reply_to_message_id': m.replyToMessageId,
      'forward_from_message_id': m.forwardFromMessageId,
      'mentions': m.mentions != null
          ? jsonEncode(m.mentions!.map((e) => e.toJson()).toList())
          : null,
      'status': m.status.wireName,
      'translation': m.translation,
      'read_count': m.readCount,
      'is_read_by_peer': m.isReadByPeer ? 1 : 0,
      'failure_reason': m.failureReason,
      'is_self': m.isSelf ? 1 : 0,
    };
  }

  Message _rowToMessage(Map<String, dynamic> row) {
    MessageBody body;
    try {
      body = MessageBody.fromJson(
          jsonDecode(row['body'] as String) as Map<String, dynamic>);
    } catch (_) {
      body = const MessageBody();
    }

    final mentions = _mentionsFromJson(row['mentions'] as String?);

    final isRecalled = (row['is_recalled'] as int) == 1;
    final status = isRecalled
        ? MessageStatus.recalled
        : parseMessageStatus(row['status'] as String?);

    return Message(
      messageId: row['message_id'] as String,
      clientMsgId: row['client_msg_id'] as String?,
      conversationId: row['conversation_id'] as String,
      conversationSeq: row['conversation_seq'] as int,
      senderUserId: row['sender_user_id'] as String,
      type: _parseMessageType(row['message_type'] as String),
      body: body,
      isRecalled: isRecalled,
      sentAt: DateTime.fromMillisecondsSinceEpoch(row['sent_at'] as int,
          isUtc: true),
      replyToMessageId: row['reply_to_message_id'] as String?,
      forwardFromMessageId: row['forward_from_message_id'] as String?,
      mentions: mentions,
      status: status,
      translation: row['translation'] as String?,
      readCount: row['read_count'] as int? ?? 0,
      isReadByPeer: (row['is_read_by_peer'] as int? ?? 0) == 1,
      failureReason: row['failure_reason'] as String?,
      isSelf: (row['is_self'] as int? ?? 0) == 1,
    );
  }

  MessageType _parseMessageType(String raw) {
    switch (raw) {
      case 'markdown':
        return MessageType.markdown;
      case 'image':
        return MessageType.image;
      case 'video':
        return MessageType.video;
      case 'voice':
        return MessageType.voice;
      case 'file':
        return MessageType.file;
      case 'event':
        return MessageType.event;
      case 'contact_card':
        return MessageType.contactCard;
      case 'call_log':
        return MessageType.callLog;
      case 'location':
        return MessageType.location;
      default:
        return MessageType.text;
    }
  }

  // ── 序列化：会话 ──────────────────────────────────────────────────────────

  Map<String, dynamic> _conversationToRow(Conversation c) {
    return {
      'conversation_id': c.conversationId,
      'type': switch (c.type) {
        ConversationType.group => 'group',
        ConversationType.tempSession => 'temp_session',
        ConversationType.direct => 'direct',
      },
      'title': c.title,
      'avatar_url': c.avatarUrl,
      'last_message_id': c.lastMessage?.messageId,
      'last_message_preview': c.lastMessage?.text,
      'last_message_type': c.lastMessage?.messageType,
      'last_message_sender_id': c.lastMessage?.senderUserId,
      'last_message_mentions': c.lastMessage?.mentions != null
          ? jsonEncode(c.lastMessage!.mentions!.map((e) => e.toJson()).toList())
          : null,
      'last_message_is_self': c.lastMessage?.isSelf == true ? 1 : 0,
      'last_message_direction': c.lastMessage?.direction,
      'last_activity_at': c.lastActivityAt?.millisecondsSinceEpoch,
      'unread_count': c.unreadCount,
      'last_read_seq': c.lastReadSeq,
      'last_message_seq': c.lastMessageSeq,
      'is_pinned': c.isPinned ? 1 : 0,
      'is_muted': c.isMuted ? 1 : 0,
      'draft': c.draft,
      'peer_user_id': c.peerUserId,
      'member_count': c.memberCount,
      'member_avatar_urls':
          c.memberAvatarUrls != null ? jsonEncode(c.memberAvatarUrls) : null,
      'member_names': c.memberNames != null ? jsonEncode(c.memberNames) : null,
    };
  }

  Conversation _rowToConversation(Map<String, dynamic> row) {
    final typeStr = row['type'] as String? ?? 'direct';
    final ConversationType type;
    switch (typeStr) {
      case 'group':
        type = ConversationType.group;
      case 'temp_session':
        type = ConversationType.tempSession;
      default:
        type = ConversationType.direct;
    }

    LastMessage? lastMessage;
    final lastMsgId = row['last_message_id'] as String?;
    if (lastMsgId != null) {
      final sentAtRaw = row['last_activity_at'] as int?;
      final mentions =
          _mentionsFromJson(row['last_message_mentions'] as String?);
      lastMessage = LastMessage(
        messageId: lastMsgId,
        text: row['last_message_preview'] as String?,
        messageType: row['last_message_type'] as String? ?? 'text',
        senderUserId: row['last_message_sender_id'] as String? ?? '',
        sentAt: sentAtRaw != null
            ? DateTime.fromMillisecondsSinceEpoch(sentAtRaw, isUtc: true)
            : DateTime.now(),
        isSelf: (row['last_message_is_self'] as int? ?? 0) == 1,
        direction: row['last_message_direction'] as String?,
        mentions: mentions,
      );
    }

    List<String?>? memberAvatarUrls;
    try {
      final raw = row['member_avatar_urls'] as String?;
      if (raw != null) {
        memberAvatarUrls = (jsonDecode(raw) as List<dynamic>)
            .map((e) => e as String?)
            .toList();
      }
    } catch (_) {
      memberAvatarUrls = null;
    }

    List<String>? memberNames;
    try {
      final raw = row['member_names'] as String?;
      if (raw != null) {
        memberNames =
            (jsonDecode(raw) as List<dynamic>).map((e) => e as String).toList();
      }
    } catch (_) {
      memberNames = null;
    }

    final lastActivityAtRaw = row['last_activity_at'] as int?;

    return Conversation(
      conversationId: row['conversation_id'] as String,
      type: type,
      title: row['title'] as String? ?? '',
      avatarUrl: row['avatar_url'] as String?,
      lastMessage: lastMessage,
      unreadCount: row['unread_count'] as int? ?? 0,
      lastReadSeq: row['last_read_seq'] as int? ?? 0,
      lastMessageSeq: row['last_message_seq'] as int? ?? 0,
      isPinned: (row['is_pinned'] as int? ?? 0) == 1,
      isMuted: (row['is_muted'] as int? ?? 0) == 1,
      draft: row['draft'] as String?,
      lastActivityAt: lastActivityAtRaw != null
          ? DateTime.fromMillisecondsSinceEpoch(lastActivityAtRaw, isUtc: true)
          : null,
      peerUserId: row['peer_user_id'] as String?,
      memberCount: row['member_count'] as int?,
      memberAvatarUrls: memberAvatarUrls,
      memberNames: memberNames,
    );
  }

  List<Mention>? _mentionsFromJson(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    try {
      final mentions = (jsonDecode(raw) as List<dynamic>)
          .map((e) => Mention.fromJson(e as Map<String, dynamic>))
          .toList();
      return mentions.isEmpty ? null : mentions;
    } catch (_) {
      return null;
    }
  }

  // ── 新增方法实现 ──────────────────────────────────────────────────────────

  @override
  Future<List<Message>> getMessages(
    String spaceId,
    String conversationId, {
    int? beforeSeq,
    int limit = 50,
  }) async {
    final db = await AppDatabase.of(spaceId);
    final table = _messageTable(conversationId);

    // 表不存在时返回空列表
    final tableExists = await _tableExists(db, table);
    if (!tableExists) return [];

    List<Map<String, dynamic>> rows;
    if (beforeSeq != null) {
      rows = await db.query(
        table,
        where: 'conversation_seq < ?',
        whereArgs: [beforeSeq],
        orderBy: 'conversation_seq DESC',
        limit: limit,
      );
    } else {
      rows = await db.query(
        table,
        orderBy: 'conversation_seq DESC',
        limit: limit,
      );
    }

    return sortMessagesForTimeline(rows.map(_rowToMessage));
  }

  @override
  Future<void> upsertMessages(
    String spaceId,
    String conversationId,
    List<Message> messages,
  ) async {
    if (messages.isEmpty) return;
    final db = await AppDatabase.of(spaceId);
    await _ensureMessageTable(db, conversationId);
    final table = _messageTable(conversationId);
    final batch = db.batch();
    for (final m in messages) {
      _deleteSupersededOptimisticRows(batch, table, m);
      batch.insert(table, _messageToRow(m),
          conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
    await const ChatLocalSearchIndex()
        .upsertMessages(spaceId, conversationId, messages);
  }

  @override
  Future<int> getLocalMaxSeq(String spaceId, String conversationId) async {
    final db = await AppDatabase.of(spaceId);
    final table = _messageTable(conversationId);

    final tableExists = await _tableExists(db, table);
    if (!tableExists) return 0;

    final result = await db
        .rawQuery('SELECT MAX(conversation_seq) AS max_seq FROM $table');
    final maxSeq = result.first['max_seq'];
    return maxSeq == null ? 0 : maxSeq as int;
  }

  @override
  Future<List<Conversation>> getConversations(String spaceId) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureConversationLastMessageColumns(db);
    final rows = await db.query(
      'conversations',
      orderBy: 'is_pinned DESC, last_activity_at DESC',
    );
    final conversations = <Conversation>[];
    for (final row in rows) {
      conversations.add(await _rowToConversationWithMessageBackfill(db, row));
    }
    return conversations;
  }

  Future<Conversation> _rowToConversationWithMessageBackfill(
    Database db,
    Map<String, dynamic> row,
  ) async {
    final conversation = _rowToConversation(row);
    final lastMessage = conversation.lastMessage;
    if (lastMessage == null || lastMessage.mentions != null) {
      return conversation;
    }
    final mentions =
        await _lastMessageMentionsFromMessageTable(db, conversation);
    if (mentions == null) return conversation;
    return conversation.copyWith(
      lastMessage: lastMessage.copyWith(mentions: mentions),
    );
  }

  Future<List<Mention>?> _lastMessageMentionsFromMessageTable(
    Database db,
    Conversation conversation,
  ) async {
    final lastMessage = conversation.lastMessage;
    if (lastMessage == null) return null;
    final table = _messageTable(conversation.conversationId);
    if (!await _tableExists(db, table)) return null;
    final rows = await db.query(
      table,
      columns: const ['mentions'],
      where: lastMessage.messageId.isNotEmpty
          ? 'message_id = ?'
          : 'conversation_seq = ?',
      whereArgs: [
        lastMessage.messageId.isNotEmpty
            ? lastMessage.messageId
            : conversation.lastMessageSeq,
      ],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return _mentionsFromJson(rows.first['mentions'] as String?);
  }

  @override
  Future<void> upsertConversations(
      String spaceId, List<Conversation> conversations) async {
    if (conversations.isEmpty) return;
    final db = await AppDatabase.of(spaceId);
    await _ensureConversationLastMessageColumns(db);
    final batch = db.batch();
    for (final c in conversations) {
      final merged = await _preserveExistingLastMessageMentions(db, c);
      batch.insert('conversations', _conversationToRow(merged),
          conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }

  @override
  Future<void> upsertConversation(
      String spaceId, Conversation conversation) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureConversationLastMessageColumns(db);
    final merged = await _preserveExistingLastMessageMentions(db, conversation);
    await db.insert('conversations', _conversationToRow(merged),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<Conversation> _preserveExistingLastMessageMentions(
    Database db,
    Conversation next,
  ) async {
    final nextLast = next.lastMessage;
    if (nextLast == null || nextLast.mentions != null) return next;
    final rows = await db.query(
      'conversations',
      where: 'conversation_id = ?',
      whereArgs: [next.conversationId],
      limit: 1,
    );
    if (rows.isEmpty) return next;
    final existing = _rowToConversation(rows.first);
    final existingLast = existing.lastMessage;
    if (existingLast?.mentions == null || !_isSameLastMessage(existing, next)) {
      return next;
    }
    return next.copyWith(
      lastMessage: nextLast.copyWith(mentions: existingLast!.mentions),
    );
  }

  @override
  Future<void> updateConversationSummaryFromMessage(
    String spaceId, {
    required String conversationId,
    required ConversationType fallbackType,
    required Message message,
    bool isSelf = false,
  }) async {
    if (fallbackType == ConversationType.tempSession) {
      await deleteConversation(spaceId, conversationId);
      return;
    }
    Conversation? existing;
    for (final conversation in await getConversations(spaceId)) {
      if (conversation.conversationId == conversationId) {
        existing = conversation;
        break;
      }
    }
    final lastMessageSeq =
        message.conversationSeq > (existing?.lastMessageSeq ?? 0)
            ? message.conversationSeq
            : (existing?.lastMessageSeq ?? message.conversationSeq);
    final isSelfMessage = isSelf || message.isSelf;
    final isDuplicateLastMessage =
        existing?.lastMessage != null && _isSameMessage(existing!, message);
    final unreadDelta = !isSelfMessage &&
            !isDuplicateLastMessage &&
            message.type != MessageType.event
        ? 1
        : 0;
    final inferredPeerUserId =
        fallbackType == ConversationType.direct && !isSelf
            ? message.senderUserId
            : null;
    final updated = (existing ??
            Conversation(
              conversationId: conversationId,
              type: fallbackType,
              title: '',
              peerUserId: inferredPeerUserId,
            ))
        .copyWith(
      type: existing?.type ?? fallbackType,
      peerUserId: existing?.peerUserId ?? inferredPeerUserId,
      lastMessage: LastMessage(
        messageId: message.messageId,
        text: message.body.text,
        messageType: MessageModel.toJson(message)['messageType'] as String,
        senderUserId: message.senderUserId,
        sentAt: message.sentAt,
        isSelf: isSelfMessage,
        direction: isSelfMessage ? 'out' : null,
        mentions: message.mentions,
      ),
      lastActivityAt: message.sentAt,
      lastMessageSeq: lastMessageSeq,
      unreadCount:
          isSelfMessage ? 0 : (existing?.unreadCount ?? 0) + unreadDelta,
    );
    await upsertConversation(spaceId, updated);
  }

  bool _isSameMessage(Conversation conversation, Message message) {
    final last = conversation.lastMessage;
    if (last == null) return false;
    if (last.messageId.isNotEmpty &&
        message.messageId.isNotEmpty &&
        last.messageId == message.messageId) {
      return true;
    }
    return conversation.lastMessageSeq > 0 &&
        message.conversationSeq > 0 &&
        conversation.lastMessageSeq == message.conversationSeq;
  }

  bool _isSameLastMessage(Conversation current, Conversation next) {
    final currentLast = current.lastMessage;
    final nextLast = next.lastMessage;
    if (currentLast == null || nextLast == null) return false;
    if (currentLast.messageId.isNotEmpty &&
        nextLast.messageId.isNotEmpty &&
        currentLast.messageId == nextLast.messageId) {
      return true;
    }
    return current.lastMessageSeq > 0 &&
        next.lastMessageSeq > 0 &&
        current.lastMessageSeq == next.lastMessageSeq;
  }

  @override
  Future<void> updateConversationDraft(
    String spaceId,
    String conversationId,
    String? draft,
  ) async {
    final db = await AppDatabase.of(spaceId);
    await db.update(
      'conversations',
      {'draft': draft},
      where: 'conversation_id = ?',
      whereArgs: [conversationId],
    );
  }

  @override
  Future<void> clearConversationMessages(
      String spaceId, String conversationId) async {
    final db = await AppDatabase.of(spaceId);
    final table = _messageTable(conversationId);
    final tableExists = await _tableExists(db, table);
    if (!tableExists) return;
    await db.delete(table);
  }

  @override
  Future<void> deleteConversation(String spaceId, String conversationId) async {
    final db = await AppDatabase.of(spaceId);
    await db.delete(
      'conversations',
      where: 'conversation_id = ?',
      whereArgs: [conversationId],
    );
    await clearConversationMessages(spaceId, conversationId);
  }

  @override
  Future<void> deleteDatabase(String spaceId) async {
    await AppDatabase.delete(spaceId);
  }

  @override
  Future<void> updateConversationUnreadCount(
      String spaceId, String conversationId, int unreadCount) async {
    final db = await AppDatabase.of(spaceId);
    await db.update(
      'conversations',
      {'unread_count': unreadCount},
      where: 'conversation_id = ?',
      whereArgs: [conversationId],
    );
  }

  @override
  Future<void> updateConversationReadState(
    String spaceId,
    String conversationId, {
    required int readSeq,
    int? unreadCount,
  }) async {
    final db = await AppDatabase.of(spaceId);
    await db.update(
      'conversations',
      {
        'last_read_seq': readSeq,
        if (unreadCount != null) 'unread_count': unreadCount,
      },
      where: 'conversation_id = ?',
      whereArgs: [conversationId],
    );
  }

  @override
  Future<void> markMessageRecalled(
      String spaceId, String conversationId, String messageId) async {
    final db = await AppDatabase.of(spaceId);
    final table = _messageTable(conversationId);
    final tableExists = await _tableExists(db, table);
    if (!tableExists) return;
    await db.update(
      table,
      {'is_recalled': 1},
      where: 'message_id = ?',
      whereArgs: [messageId],
    );
    await const ChatLocalSearchIndex()
        .deleteMessage(spaceId, conversationId, messageId);
  }

  @override
  Future<void> markOwnMessagesReadByPeer(
    String spaceId,
    String conversationId, {
    required String currentUserId,
    required int readSeq,
  }) async {
    if (currentUserId.trim().isEmpty || readSeq <= 0) return;
    final db = await AppDatabase.of(spaceId);
    await _ensureMessageTable(db, conversationId);
    final table = _messageTable(conversationId);
    await db.update(
      table,
      {
        'is_read_by_peer': 1,
        'status': MessageStatus.read.wireName,
      },
      where: '''
        conversation_seq > 0
        AND conversation_seq <= ?
        AND is_recalled = 0
        AND (
          is_self = 1
          OR lower(sender_user_id) = lower(?)
        )
        AND status NOT IN (?, ?, ?, ?)
      ''',
      whereArgs: [
        readSeq,
        currentUserId,
        MessageStatus.failed.wireName,
        MessageStatus.rejected.wireName,
        MessageStatus.recalled.wireName,
        MessageStatus.deletedLocal.wireName,
      ],
    );
  }

  // ── 旧方法委托（保持接口兼容）────────────────────────────────────────────

  @override
  Future<List<Conversation>?> getCachedConversations(String spaceId) async {
    final list = await getConversations(spaceId);
    return list.isEmpty ? null : list;
  }

  @override
  Future<void> cacheConversations(
      String spaceId, List<Conversation> conversations) async {
    await upsertConversations(spaceId, conversations);
  }

  @override
  Future<List<Message>?> getCachedMessages(
      String spaceId, String conversationId) async {
    final list = await getMessages(spaceId, conversationId);
    return list.isEmpty ? null : list;
  }

  @override
  Future<void> cacheMessages(
      String spaceId, String conversationId, List<Message> messages) async {
    await upsertMessages(spaceId, conversationId, messages);
  }

  @override
  Future<void> upsertMessage(
      String spaceId, String conversationId, Message message) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureMessageTable(db, conversationId);
    final table = _messageTable(conversationId);
    final batch = db.batch();
    _deleteSupersededOptimisticRows(batch, table, message);
    batch.insert(table, _messageToRow(message),
        conflictAlgorithm: ConflictAlgorithm.replace);
    await batch.commit(noResult: true);
    await const ChatLocalSearchIndex()
        .upsertMessages(spaceId, conversationId, [message]);
  }

  @override
  Future<void> deleteMessage(
      String spaceId, String conversationId, String messageId) async {
    final db = await AppDatabase.of(spaceId);
    final table = _messageTable(conversationId);
    final tableExists = await _tableExists(db, table);
    if (!tableExists) return;
    await db.delete(
      table,
      where: 'message_id = ? OR client_msg_id = ?',
      whereArgs: [messageId, messageId],
    );
    await const ChatLocalSearchIndex()
        .deleteMessage(spaceId, conversationId, messageId);
  }

  // ── 内部工具 ──────────────────────────────────────────────────────────────

  void _deleteSupersededOptimisticRows(
    Batch batch,
    String table,
    Message message,
  ) {
    final clientMsgId = message.clientMsgId;
    if (clientMsgId == null ||
        clientMsgId.isEmpty ||
        clientMsgId == message.messageId) {
      return;
    }
    batch.delete(
      table,
      where: '(client_msg_id = ? OR message_id = ?) AND message_id != ?',
      whereArgs: [clientMsgId, clientMsgId, message.messageId],
    );
  }

  Future<bool> _tableExists(Database db, String tableName) async {
    final result = await db.rawQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName],
    );
    return result.isNotEmpty;
  }

  Future<void> _ensureColumn(
    Database db,
    String tableName,
    String columnName,
    String definition,
  ) async {
    final columns = await db.rawQuery('PRAGMA table_info($tableName)');
    final exists = columns.any((row) => row['name'] == columnName);
    if (!exists) {
      try {
        await db.execute(
          'ALTER TABLE $tableName ADD COLUMN $columnName $definition',
        );
      } catch (error) {
        if (isDuplicateColumnSqliteError(error, columnName)) return;
        rethrow;
      }
    }
  }

  Future<void> _ensureConversationLastMessageColumns(Database db) async {
    await _ensureColumn(
      db,
      'conversations',
      'last_message_is_self',
      'INTEGER NOT NULL DEFAULT 0',
    );
    await _ensureColumn(db, 'conversations', 'last_message_direction', 'TEXT');
    await _ensureColumn(db, 'conversations', 'last_message_mentions', 'TEXT');
  }
}

@visibleForTesting
bool isDuplicateColumnSqliteError(Object error, String columnName) {
  final message = error.toString().toLowerCase();
  final normalizedColumn = columnName.toLowerCase();
  return message.contains('duplicate column name') &&
      message.contains(normalizedColumn);
}
