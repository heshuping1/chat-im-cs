import 'package:lpp_mobile/core/database/app_database.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:sqflite/sqflite.dart';

class ChatLocalSearchIndex {
  const ChatLocalSearchIndex();

  static const _createMessageIndex = '''
    CREATE TABLE IF NOT EXISTS chat_message_search_index (
      id              TEXT PRIMARY KEY,
      space_id        TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      message_id      TEXT NOT NULL,
      message_type    TEXT NOT NULL,
      plain_text      TEXT,
      sender_user_id  TEXT NOT NULL,
      sent_at         INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL,
      UNIQUE(space_id, conversation_id, message_id)
    )
  ''';

  static const _createMediaIndex = '''
    CREATE TABLE IF NOT EXISTS chat_media_index (
      id              TEXT PRIMARY KEY,
      space_id        TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      message_id      TEXT NOT NULL,
      media_kind      TEXT NOT NULL,
      file_name       TEXT,
      mime_type       TEXT,
      size_bytes      INTEGER,
      thumbnail_url   TEXT,
      remote_url      TEXT NOT NULL,
      sent_at         INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL,
      UNIQUE(space_id, conversation_id, message_id, media_kind)
    )
  ''';

  static const _indexes = [
    '''
    CREATE INDEX IF NOT EXISTS idx_chat_message_search_conversation
      ON chat_message_search_index (space_id, conversation_id, sent_at)
    ''',
    '''
    CREATE INDEX IF NOT EXISTS idx_chat_media_conversation
      ON chat_media_index (space_id, conversation_id, sent_at)
    ''',
    '''
    CREATE INDEX IF NOT EXISTS idx_chat_media_kind
      ON chat_media_index (space_id, conversation_id, media_kind, sent_at)
    ''',
  ];

  Future<void> upsertMessages(
    String spaceId,
    String conversationId,
    Iterable<Message> messages,
  ) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureTables(db);
    final batch = db.batch();
    final now = DateTime.now().millisecondsSinceEpoch;
    for (final message in messages) {
      batch.insert(
        'chat_message_search_index',
        {
          'id': '$spaceId|$conversationId|${message.messageId}',
          'space_id': spaceId,
          'conversation_id': conversationId,
          'message_id': message.messageId,
          'message_type': message.type.name,
          'plain_text': _plainText(message),
          'sender_user_id': message.senderUserId,
          'sent_at': message.sentAt.millisecondsSinceEpoch,
          'updated_at': now,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      final media = _mediaFor(message);
      if (media != null) {
        final (kind, resource) = media;
        batch.insert(
          'chat_media_index',
          {
            'id': '$spaceId|$conversationId|${message.messageId}|$kind',
            'space_id': spaceId,
            'conversation_id': conversationId,
            'message_id': message.messageId,
            'media_kind': kind,
            'file_name': resource.fileName,
            'mime_type': resource.mimeType,
            'size_bytes': resource.sizeBytes,
            'thumbnail_url': resource.thumbnailUrl,
            'remote_url': resource.url,
            'sent_at': message.sentAt.millisecondsSinceEpoch,
            'updated_at': now,
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    }
    await batch.commit(noResult: true);
  }

  Future<void> deleteMessage(
    String spaceId,
    String conversationId,
    String messageId,
  ) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureTables(db);
    await db.delete(
      'chat_message_search_index',
      where: 'space_id = ? AND conversation_id = ? AND message_id = ?',
      whereArgs: [spaceId, conversationId, messageId],
    );
    await db.delete(
      'chat_media_index',
      where: 'space_id = ? AND conversation_id = ? AND message_id = ?',
      whereArgs: [spaceId, conversationId, messageId],
    );
  }

  Future<List<Map<String, Object?>>> searchMessages({
    required String spaceId,
    required String conversationId,
    required String keyword,
    int limit = 50,
  }) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureTables(db);
    return db.query(
      'chat_message_search_index',
      where:
          'space_id = ? AND conversation_id = ? AND plain_text LIKE ? COLLATE NOCASE',
      whereArgs: [spaceId, conversationId, '%$keyword%'],
      orderBy: 'sent_at DESC',
      limit: limit,
    );
  }

  Future<List<Map<String, Object?>>> mediaForConversation({
    required String spaceId,
    required String conversationId,
    String? mediaKind,
    int limit = 100,
  }) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureTables(db);
    return db.query(
      'chat_media_index',
      where: mediaKind == null
          ? 'space_id = ? AND conversation_id = ?'
          : 'space_id = ? AND conversation_id = ? AND media_kind = ?',
      whereArgs: mediaKind == null
          ? [spaceId, conversationId]
          : [spaceId, conversationId, mediaKind],
      orderBy: 'sent_at DESC',
      limit: limit,
    );
  }

  Future<void> _ensureTables(Database db) async {
    await db.execute(_createMessageIndex);
    await db.execute(_createMediaIndex);
    for (final script in _indexes) {
      await db.execute(script);
    }
  }

  String? _plainText(Message message) {
    switch (message.type) {
      case MessageType.text:
      case MessageType.markdown:
      case MessageType.event:
        return message.body.text ?? message.body.event;
      case MessageType.file:
        return message.body.file?.fileName;
      case MessageType.image:
        return message.body.image?.fileName;
      case MessageType.video:
        return message.body.video?.fileName;
      case MessageType.voice:
        return message.body.voice?.fileName;
      case MessageType.contactCard:
        return message.body.contactCard?.displayName;
      case MessageType.callLog:
      case MessageType.location:
        return message.body.text;
    }
  }

  (String, MediaResource)? _mediaFor(Message message) {
    switch (message.type) {
      case MessageType.image:
        final media = message.body.image;
        return media == null ? null : ('image', media);
      case MessageType.video:
        final media = message.body.video;
        return media == null ? null : ('video', media);
      case MessageType.voice:
        final media = message.body.voice;
        return media == null ? null : ('voice', media);
      case MessageType.file:
        final media = message.body.file;
        return media == null ? null : ('file', media);
      case MessageType.text:
      case MessageType.markdown:
      case MessageType.event:
      case MessageType.contactCard:
      case MessageType.callLog:
      case MessageType.location:
        return null;
    }
  }
}
