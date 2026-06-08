import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

class MessageContextCapabilities {
  final bool canUseServerMessage;
  final bool canMultiSelect;
  final bool canReply;
  final bool canAiReply;
  final bool canCopy;
  final bool canVoiceToText;
  final bool canTranslate;
  final bool canSaveToAlbum;
  final bool canForward;
  final bool canFavorite;
  final bool canRecall;
  final bool canDelete;

  const MessageContextCapabilities({
    required this.canUseServerMessage,
    required this.canMultiSelect,
    required this.canReply,
    required this.canAiReply,
    required this.canCopy,
    required this.canVoiceToText,
    required this.canTranslate,
    required this.canSaveToAlbum,
    required this.canForward,
    required this.canFavorite,
    required this.canRecall,
    required this.canDelete,
  });
}

MessageContextCapabilities messageContextCapabilities(
  Message message, {
  required String currentUserId,
  DateTime? now,
}) {
  final isText =
      message.type == MessageType.text || message.type == MessageType.markdown;
  final isVoice = message.type == MessageType.voice;
  final isImageOrVideo =
      message.type == MessageType.image || message.type == MessageType.video;
  final isSent = message.status.isServerUsable;
  final canUseServerMessage = !message.isRecalled && isSent;
  final hasText = message.body.text?.isNotEmpty ?? false;
  final hasTrimmedText = message.body.text?.trim().isNotEmpty ?? false;
  final isSelf = message.senderUserId == currentUserId;
  final elapsed = (now ?? DateTime.now()).difference(message.sentAt);

  return MessageContextCapabilities(
    canUseServerMessage: canUseServerMessage,
    canMultiSelect: canUseServerMessage,
    canReply: canUseServerMessage && message.type != MessageType.event,
    canAiReply: canUseServerMessage && isText && hasTrimmedText,
    canCopy: !message.isRecalled && isText && hasText,
    canVoiceToText: canUseServerMessage && isVoice,
    canTranslate: canUseServerMessage && isText,
    canSaveToAlbum: canUseServerMessage && isImageOrVideo,
    canForward: canUseServerMessage,
    canFavorite: canUseServerMessage,
    canRecall: isSelf && isSent && elapsed.inMinutes < 2,
    canDelete: true,
  );
}
