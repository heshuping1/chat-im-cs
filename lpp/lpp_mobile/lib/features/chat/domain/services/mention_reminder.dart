import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

enum MentionReminderKind { none, all, me }

typedef UnreadMentionReminder = ({MentionReminderKind kind, String messageId});

MentionReminderKind mentionReminderKindForMessage({
  required List<Mention>? mentions,
  required String? currentUserId,
  required bool isGroup,
  required bool isSelf,
}) {
  if (isSelf || !isGroup || mentions == null || mentions.isEmpty) {
    return MentionReminderKind.none;
  }
  final userId = currentUserId?.trim();
  final hasMe = userId != null &&
      userId.isNotEmpty &&
      mentions.any(
        (mention) =>
            mention.type == MentionTargetType.user && mention.userId == userId,
      );
  if (hasMe) return MentionReminderKind.me;

  final hasAll = mentions.any((mention) => mention.isAll);
  return hasAll ? MentionReminderKind.all : MentionReminderKind.none;
}

MentionReminderKind mentionReminderKindForConversation(
  Conversation conversation, {
  required String? currentUserId,
}) {
  if (conversation.unreadCount <= 0) return MentionReminderKind.none;
  final lastMessage = conversation.lastMessage;
  if (lastMessage == null) return MentionReminderKind.none;
  return mentionReminderKindForMessage(
    mentions: lastMessage.mentions,
    currentUserId: currentUserId,
    isGroup: conversation.type == ConversationType.group,
    isSelf: lastMessage.isSelf,
  );
}

String? mentionReminderLabel(MentionReminderKind kind) {
  return switch (kind) {
    MentionReminderKind.me => '[@我]',
    MentionReminderKind.all => '[@所有人]',
    MentionReminderKind.none => null,
  };
}

UnreadMentionReminder? latestUnreadMentionReminderForMessages({
  required List<Message> messages,
  required String? currentUserId,
  required bool isGroup,
  required int lastReadSeq,
}) {
  final userId = currentUserId?.trim();
  if (!isGroup || userId == null || userId.isEmpty) return null;
  for (var index = messages.length - 1; index >= 0; index--) {
    final message = messages[index];
    if (message.conversationSeq <= lastReadSeq) continue;
    final kind = mentionReminderKindForMessage(
      mentions: message.mentions,
      currentUserId: userId,
      isGroup: isGroup,
      isSelf: message.senderUserId == userId || message.isSelf,
    );
    if (kind != MentionReminderKind.none) {
      return (kind: kind, messageId: message.messageId);
    }
  }
  return null;
}
