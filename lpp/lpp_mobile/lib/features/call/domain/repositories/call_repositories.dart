import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

/// Call 模块 domain repository 接口
///
/// 通话会话分配走 REST API，通话中的信令由 CallService（SignalR Hub）处理。
abstract class CallRepository {
  Future<({String callId, String relayUrl})> createVoiceCallSession({
    required String targetUserId,
    required bool isVideo,
    String? videoProfile,
  });

  /// 通话结束后，在会话中插入一条 call_log 消息
  /// 对应 POST /api/client/v1/direct-chats/{chatId}/messages (messageType: call_log)
  Future<Message> sendCallLogMessage({
    required String chatId,
    required String clientMsgId,
    required String callId,
    required String mediaMode, // 'audio' | 'audioVideo'
    required int durationSeconds,
    required String endReason,
    required bool isCaller,
  });
}
