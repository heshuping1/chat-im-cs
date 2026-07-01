import 'dart:io';

import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/network/api_response.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/features/chat/data/models/conversation_model.dart';
import 'package:lpp_mobile/features/chat/data/models/message_model.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation_page.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/read_receipt.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';

MessageType _messageTypeFromString(String raw) {
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

class ScheduledMessageDto {
  final String scheduledMessageId;
  final String conversationId;
  final bool isGroup;
  final String messageType;
  final Map<String, dynamic> rawBody;
  final DateTime scheduledAt;
  final int status;
  final String? failureReason;

  const ScheduledMessageDto({
    required this.scheduledMessageId,
    required this.conversationId,
    required this.isGroup,
    required this.messageType,
    required this.rawBody,
    required this.scheduledAt,
    this.status = 0,
    this.failureReason,
  });

  factory ScheduledMessageDto.fromJson(Map<String, dynamic> json) {
    final messageType = json['messageType'] as String? ?? 'text';
    final rawBody = Map<String, dynamic>.from(json['body'] as Map? ?? const {});
    return ScheduledMessageDto(
      scheduledMessageId: json['scheduledMessageId'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      isGroup: json['isGroup'] as bool? ?? false,
      messageType: messageType,
      rawBody: rawBody,
      scheduledAt: DateTime.tryParse(json['scheduledAt'] as String? ?? '') ??
          DateTime.now(),
      status: json['status'] as int? ?? 0,
      failureReason: json['failureReason'] as String?,
    );
  }

  ScheduledMessage toDomain() {
    return ScheduledMessage(
      scheduledMessageId: scheduledMessageId,
      conversationId: conversationId,
      isGroup: isGroup,
      type: _messageTypeFromString(messageType),
      body: MessageBody.fromJson(rawBody),
      scheduledAt: scheduledAt,
      status: status,
      failureReason: failureReason,
    );
  }
}

abstract class ChatRemoteDataSource {
  Future<ConversationsPage> getConversations({String? cursor, int limit = 50});
  Future<void> pinDirectChat(String chatId, bool pinned);
  Future<void> pinGroup(String groupId, bool pinned);
  Future<void> muteDirectChat(String chatId, bool muted);

  /// PUT /api/client/v1/groups/{groupId}/mute
  Future<void> muteGroup(String groupId, bool muted);

  /// GET /api/client/v1/direct-chats/{chatId}/messages
  Future<List<Message>> getDirectChatMessages(
    String chatId, {
    int? beforeSeq,
    int limit = 50,
  });

  /// GET /api/client/v1/groups/{groupId}/messages
  Future<List<Message>> getGroupMessages(
    String groupId, {
    int? beforeSeq,
    int limit = 50,
  });

  /// POST /api/client/v1/direct-chats/{chatId}/messages
  Future<Message> sendDirectChatMessage({
    required String chatId,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
  });

  /// POST /api/client/v1/groups/{groupId}/messages
  Future<Message> sendGroupMessage({
    required String groupId,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
    List<Mention>? mentions,
  });

  /// POST /api/client/v1/scheduled-messages
  Future<ScheduledMessageDto> createScheduledMessage({
    required String conversationId,
    required bool isGroup,
    required MessageType type,
    required MessageBody body,
    required DateTime scheduledAt,
    String? replyToMessageId,
  });

  /// GET /api/client/v1/conversations/{conversationId}/scheduled-messages
  Future<List<ScheduledMessageDto>> getScheduledMessages(String conversationId);

  /// DELETE /api/client/v1/scheduled-messages/{scheduledMessageId}
  Future<void> cancelScheduledMessage(String scheduledMessageId);

  /// POST /api/client/v1/media/upload
  Future<MediaResource> uploadMedia(
    String filePath, {
    String? mediaKind,
    MediaUploadProgressCallback? onProgress,
  });

  /// POST /api/client/v1/messages/{messageId}/recall
  Future<void> recallMessage(String messageId);

  /// POST /api/client/v1/direct-chats/{chatId}/read
  Future<void> markDirectChatRead(String chatId, int readSeq);

  /// GET /api/client/v1/direct-chats/{chatId}/read-status
  Future<PeerReadStatus> getDirectReadStatus(String chatId);

  /// POST /api/client/v1/groups/{groupId}/read
  Future<void> markGroupRead(String groupId, int readSeq);
}

class ChatRemoteDataSourceImpl implements ChatRemoteDataSource {
  final Dio _dio;
  final String? Function()? _accessTokenGetter;

  ChatRemoteDataSourceImpl(
    this._dio, {
    String? Function()? accessTokenGetter,
  }) : _accessTokenGetter =
            accessTokenGetter ?? (() => GlobalTokenHolder.instance.accessToken);

  @override
  Future<ConversationsPage> getConversations({
    String? cursor,
    int limit = 50,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/conversations',
        queryParameters: {
          if (cursor != null) 'cursor': cursor,
          'limit': limit,
        },
        options: _tenantAuthOptions(),
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) {
          final data = json as Map<String, dynamic>;
          final items = data['items'] as List<dynamic>? ?? [];
          final nextCursor = data['nextCursor'] as String?;
          return ConversationsPage(
            items: items
                .map((e) =>
                    ConversationModel.fromJson(e as Map<String, dynamic>))
                .toList(),
            nextCursor: nextCursor,
          );
        },
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Options? _tenantAuthOptions() {
    final token = _accessTokenGetter?.call()?.trim();
    if (token == null || token.isEmpty) return null;
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  @override
  Future<void> pinDirectChat(String chatId, bool pinned) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/api/client/v1/direct-chats/$chatId/pin',
        data: {'pinned': pinned},
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> pinGroup(String groupId, bool pinned) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/api/client/v1/groups/$groupId/pin',
        data: {'pinned': pinned},
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> muteDirectChat(String chatId, bool muted) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/api/client/v1/direct-chats/$chatId/mute',
        data: {'muted': muted},
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> muteGroup(String groupId, bool muted) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/api/client/v1/groups/$groupId/mute',
        data: {'muted': muted},
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<List<Message>> getDirectChatMessages(
    String chatId, {
    int? beforeSeq,
    int limit = 50,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/direct-chats/$chatId/messages',
        queryParameters: {
          if (beforeSeq != null) 'beforeSeq': beforeSeq,
          'limit': limit,
        },
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) {
          final list = json as List<dynamic>;
          return list
              .map((e) => MessageModel.fromJson(e as Map<String, dynamic>))
              .toList();
        },
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<List<Message>> getGroupMessages(
    String groupId, {
    int? beforeSeq,
    int limit = 50,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/groups/$groupId/messages',
        queryParameters: {
          if (beforeSeq != null) 'beforeSeq': beforeSeq,
          'limit': limit,
        },
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) {
          final list = json as List<dynamic>;
          return list
              .map((e) => MessageModel.fromJson(e as Map<String, dynamic>))
              .toList();
        },
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<Message> sendDirectChatMessage({
    required String chatId,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/direct-chats/$chatId/messages',
        data: {
          'clientMsgId': clientMsgId,
          'messageType': _messageTypeToString(type),
          'body': body.toJson(),
          if (replyToMessageId != null) 'replyToMessageId': replyToMessageId,
          'mentions': <Map<String, dynamic>>[],
        },
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => MessageModel.fromSendResponse(
          json as Map<String, dynamic>,
          clientMsgId: clientMsgId,
          type: type,
          body: body,
          conversationId: chatId,
          replyToMessageId: replyToMessageId,
        ),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<Message> sendGroupMessage({
    required String groupId,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
    List<Mention>? mentions,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/groups/$groupId/messages',
        data: {
          'clientMsgId': clientMsgId,
          'messageType': _messageTypeToString(type),
          'body': _messageBodyToRequestJson(body),
          if (replyToMessageId != null) 'replyToMessageId': replyToMessageId,
          'mentions': mentions?.map((mention) => mention.toJson()).toList() ??
              <Map<String, dynamic>>[],
        },
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => MessageModel.fromSendResponse(
          json as Map<String, dynamic>,
          clientMsgId: clientMsgId,
          type: type,
          body: body,
          conversationId: groupId,
          replyToMessageId: replyToMessageId,
          mentions: mentions,
        ),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<ScheduledMessageDto> createScheduledMessage({
    required String conversationId,
    required bool isGroup,
    required MessageType type,
    required MessageBody body,
    required DateTime scheduledAt,
    String? replyToMessageId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/scheduled-messages',
        data: {
          'conversationId': conversationId,
          'isGroup': isGroup,
          'messageType': _messageTypeToString(type),
          'body': _messageBodyToRequestJson(body),
          if (replyToMessageId != null) 'replyToMessageId': replyToMessageId,
          'scheduledAt': scheduledAt.toUtc().toIso8601String(),
        },
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => ScheduledMessageDto.fromJson(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<List<ScheduledMessageDto>> getScheduledMessages(
    String conversationId,
  ) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/conversations/$conversationId/scheduled-messages',
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) {
          final data = json;
          final items = data is Map<String, dynamic>
              ? data['items'] as List<dynamic>? ?? const []
              : data as List<dynamic>? ?? const [];
          return items
              .whereType<Map>()
              .map((item) => ScheduledMessageDto.fromJson(
                    Map<String, dynamic>.from(item),
                  ))
              .toList(growable: false);
        },
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> cancelScheduledMessage(String scheduledMessageId) async {
    try {
      await _dio.delete<Map<String, dynamic>>(
        '/api/client/v1/scheduled-messages/$scheduledMessageId',
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<MediaResource> uploadMedia(
    String filePath, {
    String? mediaKind,
    MediaUploadProgressCallback? onProgress,
  }) async {
    try {
      final fallbackTotal = await _safeFileLength(filePath);
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
        if (mediaKind != null && mediaKind.trim().isNotEmpty)
          'mediaKind': mediaKind.trim(),
      });
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/media/upload',
        data: formData,
        onSendProgress: onProgress == null
            ? null
            : (sent, total) {
                final resolvedTotal = total > 0 ? total : fallbackTotal;
                onProgress(MediaUploadProgressEvent(
                  loaded: sent,
                  total: resolvedTotal,
                ));
              },
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => MediaResource.fromJson(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<int?> _safeFileLength(String filePath) async {
    try {
      return await File(filePath).length();
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> recallMessage(String messageId) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/messages/$messageId/recall',
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> markDirectChatRead(String chatId, int readSeq) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/direct-chats/$chatId/read',
        data: {'readSeq': readSeq},
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<PeerReadStatus> getDirectReadStatus(String chatId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/direct-chats/$chatId/read-status',
      );
      final data = response.data?['data'] as Map<String, dynamic>? ?? {};
      return PeerReadStatus(
        peerLastReadSeq: _intValue(data['peerLastReadSeq']),
        peerLastReadAt: DateTime.tryParse(
          data['peerLastReadAt']?.toString() ?? '',
        ),
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> markGroupRead(String groupId, int readSeq) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/groups/$groupId/read',
        data: {'readSeq': readSeq},
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  static int _intValue(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  static String _messageTypeToString(MessageType type) {
    switch (type) {
      case MessageType.text:
        return 'text';
      case MessageType.markdown:
        return 'markdown';
      case MessageType.image:
        return 'image';
      case MessageType.video:
        return 'video';
      case MessageType.voice:
        return 'voice';
      case MessageType.file:
        return 'file';
      case MessageType.event:
        return 'event';
      case MessageType.contactCard:
        return 'contact_card';
      case MessageType.callLog:
        return 'call_log';
      case MessageType.location:
        return 'location';
    }
  }

  static Map<String, dynamic> _messageBodyToRequestJson(MessageBody body) {
    return {
      if (body.text != null) 'text': body.text,
      if (body.image != null) 'image': body.image!.toJson(),
      if (body.video != null) 'video': body.video!.toJson(),
      if (body.voice != null) 'voice': body.voice!.toJson(),
      if (body.file != null) 'file': body.file!.toJson(),
      if (body.contactCard != null) 'contactCard': body.contactCard!.toJson(),
      if (body.callLog != null) 'callLog': body.callLog!.toJson(),
      if (body.location != null) 'location': body.location!.toJson(),
    };
  }
}
