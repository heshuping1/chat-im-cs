import 'dart:convert';
import 'dart:async';

import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/storage/hive_storage.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';

typedef PendingRepositoryResolver = ChatRepository Function(
    PendingMessage message);
typedef PendingMessageResentCallback = FutureOr<void> Function(
  PendingMessage pending,
  Message sent,
);

// ---------------------------------------------------------------------------
// PendingMessage 模型
// ---------------------------------------------------------------------------

class PendingMessage {
  final String spaceId;
  final String userId;
  final String clientMsgId;
  final String conversationId;
  final bool isGroup;
  final String messageType;
  final Map<String, dynamic> body;
  final List<Mention>? mentions;
  final String? threadType;
  final String? threadId;
  final int retryCount;
  final DateTime createdAt;

  const PendingMessage({
    required this.spaceId,
    required this.userId,
    required this.clientMsgId,
    required this.conversationId,
    required this.isGroup,
    required this.messageType,
    required this.body,
    this.mentions,
    this.threadType,
    this.threadId,
    this.retryCount = 0,
    required this.createdAt,
  });

  PendingMessage copyWith({
    String? spaceId,
    String? userId,
    String? clientMsgId,
    String? conversationId,
    bool? isGroup,
    String? messageType,
    Map<String, dynamic>? body,
    List<Mention>? mentions,
    String? threadType,
    String? threadId,
    int? retryCount,
    DateTime? createdAt,
  }) {
    return PendingMessage(
      spaceId: spaceId ?? this.spaceId,
      userId: userId ?? this.userId,
      clientMsgId: clientMsgId ?? this.clientMsgId,
      conversationId: conversationId ?? this.conversationId,
      isGroup: isGroup ?? this.isGroup,
      messageType: messageType ?? this.messageType,
      body: body ?? this.body,
      mentions: mentions ?? this.mentions,
      threadType: threadType ?? this.threadType,
      threadId: threadId ?? this.threadId,
      retryCount: retryCount ?? this.retryCount,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'spaceId': spaceId,
        'userId': userId,
        'clientMsgId': clientMsgId,
        'conversationId': conversationId,
        'isGroup': isGroup,
        'messageType': messageType,
        'body': body,
        'mentions': mentions?.map((mention) => mention.toJson()).toList(),
        if (threadType != null) 'threadType': threadType,
        if (threadId != null) 'threadId': threadId,
        'retryCount': retryCount,
        'createdAt': createdAt.toIso8601String(),
      };

  factory PendingMessage.fromJson(Map<String, dynamic> json) => PendingMessage(
        spaceId: json['spaceId'] as String? ?? '',
        userId: json['userId'] as String? ?? '',
        clientMsgId: json['clientMsgId'] as String,
        conversationId: json['conversationId'] as String,
        isGroup: json['isGroup'] as bool? ?? false,
        messageType: json['messageType'] as String? ?? 'text',
        body: Map<String, dynamic>.from(json['body'] as Map? ?? {}),
        mentions: (json['mentions'] as List<dynamic>?)
            ?.map((e) => Mention.fromJson(e as Map<String, dynamic>))
            .toList(),
        threadType: json['threadType'] as String?,
        threadId: json['threadId'] as String?,
        retryCount: json['retryCount'] as int? ?? 0,
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
            DateTime.now(),
      );
}

// ---------------------------------------------------------------------------
// PendingMessageQueue
// ---------------------------------------------------------------------------

/// 离线消息队列
///
/// 使用 Hive `pending_messages` Box 持久化待发消息。
/// 网络断开时写入，网络恢复后按序重发。
class PendingMessageQueue {
  static const int _maxRetries = 3;

  /// 写入待发消息（网络断开时调用）
  Future<void> enqueue(PendingMessage message) async {
    final box = HiveStorage.pendingMessagesBox;
    final encoded = jsonEncode(message.toJson());
    await box.put(_keyFor(message), encoded);
    AppDiagnostics.instance.info(
      'chat.pending',
      'enqueued',
      context: {
        'spaceId': message.spaceId,
        'userId': message.userId,
        'conversationId': message.conversationId,
        'clientMsgId': message.clientMsgId,
        'messageType': message.messageType,
      },
    );
  }

  /// 获取所有待发消息（按创建时间升序）
  Future<List<PendingMessage>> getAll({
    String? spaceId,
    String? userId,
  }) async {
    final box = HiveStorage.pendingMessagesBox;
    final messages = <PendingMessage>[];
    for (final key in box.keys) {
      final raw = box.get(key);
      if (raw == null) continue;
      try {
        final json = jsonDecode(raw as String) as Map<String, dynamic>;
        final message = PendingMessage.fromJson(json);
        if (!_matchesIdentity(message, spaceId: spaceId, userId: userId)) {
          continue;
        }
        messages.add(message);
      } catch (_) {
        // 跳过损坏的记录
      }
    }
    messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return messages;
  }

  /// 删除已发送消息
  Future<void> remove(
    String clientMsgId, {
    String? spaceId,
    String? userId,
  }) async {
    final box = HiveStorage.pendingMessagesBox;
    if (spaceId != null && userId != null) {
      await box.delete(_storageKey(spaceId, userId, clientMsgId));
      return;
    }
    await box.delete(clientMsgId);
  }

  /// 网络恢复后按序重发所有待发消息
  ///
  /// 发送成功后从队列移除；超过最大重试次数后也移除（避免无限积压）。
  Future<void> flushAll(
    ChatRepository repository, {
    required String spaceId,
    required String userId,
    PendingRepositoryResolver? repositoryForMessage,
    PendingMessageResentCallback? onMessageResent,
  }) async {
    final pending = await getAll(spaceId: spaceId, userId: userId);
    for (final message in pending) {
      try {
        final messageRepository =
            repositoryForMessage?.call(message) ?? repository;
        final type = _parseMessageType(message.messageType);
        final body = await _resolvePendingMediaBody(
          messageRepository,
          type,
          MessageBody.fromJson(message.body),
        );

        final sent = await messageRepository.sendMessage(
          conversationId: message.conversationId,
          isGroup: message.isGroup,
          clientMsgId: message.clientMsgId,
          type: type,
          body: body,
          mentions: message.isGroup ? message.mentions : null,
        );
        await onMessageResent?.call(message, sent);

        // 发送成功，从队列移除
        await _remove(message);
        AppDiagnostics.instance.info(
          'chat.pending',
          'resent',
          context: {
            'spaceId': message.spaceId,
            'userId': message.userId,
            'conversationId': message.conversationId,
            'clientMsgId': message.clientMsgId,
          },
        );
      } catch (_) {
        // 发送失败，更新重试次数
        final updated = message.copyWith(retryCount: message.retryCount + 1);
        if (updated.retryCount >= _maxRetries) {
          // 超过最大重试次数，移除（标记为失败由上层处理）
          await _remove(message);
          AppDiagnostics.instance.warning(
            'chat.pending',
            'dropped',
            context: {
              'spaceId': message.spaceId,
              'userId': message.userId,
              'conversationId': message.conversationId,
              'clientMsgId': message.clientMsgId,
              'retryCount': updated.retryCount,
            },
          );
        } else {
          await enqueue(updated);
        }
      }
    }
  }

  Future<void> _remove(PendingMessage message) {
    return remove(
      message.clientMsgId,
      spaceId: message.spaceId,
      userId: message.userId,
    );
  }

  static bool _matchesIdentity(
    PendingMessage message, {
    String? spaceId,
    String? userId,
  }) {
    if (spaceId == null && userId == null) return true;
    return message.spaceId == spaceId && message.userId == userId;
  }

  static String _keyFor(PendingMessage message) =>
      _storageKey(message.spaceId, message.userId, message.clientMsgId);

  static String _storageKey(
          String spaceId, String userId, String clientMsgId) =>
      '$spaceId:$userId:$clientMsgId';

  static MessageType _parseMessageType(String raw) {
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

  static Future<MessageBody> _resolvePendingMediaBody(
    ChatRepository repository,
    MessageType type,
    MessageBody body,
  ) async {
    final localPath = _localMediaPath(_mediaResourceForType(type, body)?.url);
    if (localPath == null) return body;
    final uploaded = await repository.uploadMedia(
      localPath,
      mediaKind: _mediaKind(type),
    );
    if (type == MessageType.video) {
      final localVideo = body.video;
      final posterPath = _localMediaPath(localVideo?.localPosterUrl);
      if (posterPath != null) {
        try {
          final poster = await repository.uploadMedia(
            posterPath,
            mediaKind: 'image',
          );
          return _replaceMediaResource(
            body,
            type,
            uploaded.copyWith(
              thumbnailUrl: poster.url,
              localPreviewUrl: localVideo?.localPreviewUrl ?? localVideo?.url,
              localPosterUrl: localVideo?.localPosterUrl,
            ),
          );
        } catch (_) {
          return _replaceMediaResource(
            body,
            type,
            uploaded.copyWith(
              localPreviewUrl: localVideo?.localPreviewUrl ?? localVideo?.url,
              localPosterUrl: localVideo?.localPosterUrl,
            ),
          );
        }
      }
    }
    return _replaceMediaResource(body, type, uploaded);
  }

  static MediaResource? _mediaResourceForType(
      MessageType type, MessageBody body) {
    switch (type) {
      case MessageType.image:
        return body.image;
      case MessageType.video:
        return body.video;
      case MessageType.voice:
        return body.voice;
      case MessageType.file:
        return body.file;
      default:
        return null;
    }
  }

  static MessageBody _replaceMediaResource(
    MessageBody body,
    MessageType type,
    MediaResource resource,
  ) {
    switch (type) {
      case MessageType.image:
        return MessageBody(
          text: body.text,
          image: resource,
          video: body.video,
          voice: body.voice,
          file: body.file,
        );
      case MessageType.video:
        return MessageBody(
          text: body.text,
          image: body.image,
          video: resource,
          voice: body.voice,
          file: body.file,
        );
      case MessageType.voice:
        return MessageBody(
          text: body.text,
          image: body.image,
          video: body.video,
          voice: resource,
          file: body.file,
        );
      case MessageType.file:
        return MessageBody(
          text: body.text,
          image: body.image,
          video: body.video,
          voice: body.voice,
          file: resource,
        );
      default:
        return body;
    }
  }

  static String _mediaKind(MessageType type) {
    switch (type) {
      case MessageType.image:
        return 'image';
      case MessageType.video:
        return 'video';
      case MessageType.voice:
        return 'voice';
      case MessageType.file:
        return 'file';
      default:
        return 'file';
    }
  }

  static String? _localMediaPath(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    final url = value.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) return null;
    if (url.startsWith('/media') ||
        url.startsWith('/api') ||
        url.startsWith('/uploads') ||
        url.startsWith('/files')) {
      return null;
    }
    return url;
  }
}
