import 'package:lpp_mobile/features/call/data/datasources/call_datasources.dart';
import 'package:lpp_mobile/features/call/domain/repositories/call_repositories.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

class CallRepositoryImpl implements CallRepository {
  final CallRemoteDataSource _remote;

  CallRepositoryImpl(this._remote);

  @override
  Future<({String callId, String relayUrl})> createVoiceCallSession({
    required String targetUserId,
    required bool isVideo,
    String? videoProfile,
  }) async {
    final session = await _remote.createVoiceCallSession(
      targetUserId: targetUserId,
      isVideo: isVideo,
      videoProfile: videoProfile,
    );
    return (callId: session.callId, relayUrl: session.relayUrl);
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
  }) =>
      _remote.sendCallLogMessage(
        chatId: chatId,
        clientMsgId: clientMsgId,
        callId: callId,
        mediaMode: mediaMode,
        durationSeconds: durationSeconds,
        endReason: endReason,
        isCaller: isCaller,
      );
}
