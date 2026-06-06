import 'dart:convert';

import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/storage/hive_storage.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';

// ---------------------------------------------------------------------------
// PendingMessage 模型
// ---------------------------------------------------------------------------

class PendingMessage {
  final String clientMsgId;
  final String conversationId;
  final bool isGroup;
  final String messageType;
  final Map<String, dynamic> body;
  final List<Mention>? mentions;
  final int retryCount;
  final DateTime createdAt;

  const PendingMessage({
    required this.clientMsgId,
    required this.conversationId,
    required this.isGroup,
    required this.messageType,
    required this.body,
    this.mentions,
    this.retryCount = 0,
    required this.createdAt,
  });

  PendingMessage copyWith({
    String? clientMsgId,
    String? conversationId,
    bool? isGroup,
    String? messageType,
    Map<String, dynamic>? body,
    List<Mention>? mentions,
    int? retryCount,
    DateTime? createdAt,
  }) {
    return PendingMessage(
      clientMsgId: clientMsgId ?? this.clientMsgId,
      conversationId: conversationId ?? this.conversationId,
      isGroup: isGroup ?? this.isGroup,
      messageType: messageType ?? this.messageType,
      body: body ?? this.body,
      mentions: mentions ?? this.mentions,
      retryCount: retryCount ?? this.retryCount,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'clientMsgId': clientMsgId,
        'conversationId': conversationId,
        'isGroup': isGroup,
        'messageType': messageType,
        'body': body,
        'mentions': mentions?.map((mention) => mention.toJson()).toList(),
        'retryCount': retryCount,
        'createdAt': createdAt.toIso8601String(),
      };

  factory PendingMessage.fromJson(Map<String, dynamic> json) => PendingMessage(
        clientMsgId: json['clientMsgId'] as String,
        conversationId: json['conversationId'] as String,
        isGroup: json['isGroup'] as bool? ?? false,
        messageType: json['messageType'] as String? ?? 'text',
        body: Map<String, dynamic>.from(json['body'] as Map? ?? {}),
        mentions: (json['mentions'] as List<dynamic>?)
            ?.map((e) => Mention.fromJson(e as Map<String, dynamic>))
            .toList(),
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
    await box.put(message.clientMsgId, encoded);
    AppDiagnostics.instance.info(
      'chat.pending',
      'enqueued',
      context: {
        'conversationId': message.conversationId,
        'clientMsgId': message.clientMsgId,
        'messageType': message.messageType,
      },
    );
  }

  /// 获取所有待发消息（按创建时间升序）
  Future<List<PendingMessage>> getAll() async {
    final box = HiveStorage.pendingMessagesBox;
    final messages = <PendingMessage>[];
    for (final key in box.keys) {
      final raw = box.get(key);
      if (raw == null) continue;
      try {
        final json = jsonDecode(raw as String) as Map<String, dynamic>;
        messages.add(PendingMessage.fromJson(json));
      } catch (_) {
        // 跳过损坏的记录
      }
    }
    messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return messages;
  }

  /// 删除已发送消息
  Future<void> remove(String clientMsgId) async {
    final box = HiveStorage.pendingMessagesBox;
    await box.delete(clientMsgId);
  }

  /// 网络恢复后按序重发所有待发消息
  ///
  /// 发送成功后从队列移除；超过最大重试次数后也移除（避免无限积压）。
  Future<void> flushAll(ChatRepository repository) async {
    final pending = await getAll();
    for (final message in pending) {
      try {
        final type = _parseMessageType(message.messageType);
        final body = MessageBody.fromJson(message.body);

        await repository.sendMessage(
          conversationId: message.conversationId,
          isGroup: message.isGroup,
          clientMsgId: message.clientMsgId,
          type: type,
          body: body,
          mentions: message.isGroup ? message.mentions : null,
        );

        // 发送成功，从队列移除
        await remove(message.clientMsgId);
        AppDiagnostics.instance.info(
          'chat.pending',
          'resent',
          context: {
            'conversationId': message.conversationId,
            'clientMsgId': message.clientMsgId,
          },
        );
      } catch (_) {
        // 发送失败，更新重试次数
        final updated = message.copyWith(retryCount: message.retryCount + 1);
        if (updated.retryCount >= _maxRetries) {
          // 超过最大重试次数，移除（标记为失败由上层处理）
          await remove(message.clientMsgId);
          AppDiagnostics.instance.warning(
            'chat.pending',
            'dropped',
            context: {
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
}
