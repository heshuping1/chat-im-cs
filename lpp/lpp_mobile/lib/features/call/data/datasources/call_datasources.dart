import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/chat/data/models/message_model.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

abstract class CallRemoteDataSource {
  Future<VoiceCallSessionDto> createVoiceCallSession({
    required String targetUserId,
    required bool isVideo,
    String? videoProfile,
  });

  Future<Message> sendCallLogMessage({
    required String chatId,
    required String clientMsgId,
    required String callId,
    required String mediaMode,
    required int durationSeconds,
    required String endReason,
    required bool isCaller,
  });
}

class CallRemoteDataSourceImpl implements CallRemoteDataSource {
  final Dio _dio;

  CallRemoteDataSourceImpl(this._dio);

  @override
  Future<VoiceCallSessionDto> createVoiceCallSession({
    required String targetUserId,
    required bool isVideo,
    String? videoProfile,
  }) async {
    try {
      final payload = {
        'targetUserId': targetUserId,
        'mediaMode': isVideo ? 'audioVideo' : 'audio',
        if (isVideo && videoProfile != null && videoProfile.isNotEmpty)
          'videoProfile': videoProfile,
      };
      final response = await _createVoiceCallSession(payload);
      final statusCode = response.statusCode ?? 0;
      if (statusCode >= 200 && statusCode < 300) {
        final rawData = response.data?['data'];
        final data = rawData is Map ? Map<String, dynamic>.from(rawData) : null;
        if (data == null) {
          throw StateError('Voice call session response missing data');
        }
        return VoiceCallSessionDto.fromJson(data);
      }
      debugPrint(
        '[CallRemoteDataSource] voicecall session failed '
        'status=$statusCode payload=$payload body=${response.data}',
      );
      final body = response.data;
      throw StateError(
        'Voice call session failed (HTTP $statusCode): $body',
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<Response<Map<String, dynamic>>> _createVoiceCallSession(
    Map<String, dynamic> payload,
  ) {
    return _dio.post<Map<String, dynamic>>(
      '/api/client/v1/voicecall/sessions',
      data: payload,
      options: Options(
        validateStatus: (status) => status != null && status < 500,
      ),
    );
  }

  @override
  Future<Message> sendCallLogMessage({
    required String chatId,
    required String clientMsgId,
    required String callId,
    required String mediaMode,
    required int durationSeconds,
    required String endReason,
    required bool isCaller,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/direct-chats/$chatId/messages',
        data: {
          'clientMsgId': clientMsgId,
          'messageType': 'call_log',
          'body': {
            'callLog': {
              'callId': callId,
              'mediaMode': mediaMode,
              'durationSeconds': durationSeconds,
              'endReason': endReason,
              'isCaller': isCaller,
            },
          },
        },
      );
      final data = response.data?['data'] as Map<String, dynamic>? ?? {};
      return MessageModel.fromSendResponse(
        data,
        clientMsgId: clientMsgId,
        type: MessageType.callLog,
        body: MessageBody(
          callLog: CallLogDto(
            callId: callId,
            mediaMode: mediaMode,
            durationSeconds: durationSeconds,
            endReason: endReason,
            isCaller: isCaller,
          ),
        ),
        conversationId: chatId,
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }
}

class VoiceCallSessionDto {
  final String callId;
  final String relayUrl;
  final String? nodeId;
  final DateTime? expiresAt;

  const VoiceCallSessionDto({
    required this.callId,
    required this.relayUrl,
    this.nodeId,
    this.expiresAt,
  });

  factory VoiceCallSessionDto.fromJson(Map<String, dynamic> json) {
    final callId = json['callId'] as String?;
    final relayUrl = json['relayUrl'] as String?;
    if (callId == null || callId.isEmpty) {
      throw StateError('Voice call session missing callId');
    }
    if (relayUrl == null || relayUrl.isEmpty) {
      throw StateError('Voice call session missing relayUrl');
    }
    return VoiceCallSessionDto(
      callId: callId,
      relayUrl: relayUrl,
      nodeId: json['nodeId'] as String?,
      expiresAt: DateTime.tryParse(json['expiresAt'] as String? ?? ''),
    );
  }
}
