import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';

bool shouldShowNumericUnreadBadge(Conversation conversation) {
  if (conversation.unreadCount <= 0 || conversation.isMuted) return false;
  return conversation.type == ConversationType.direct;
}

int calculateMessageBadgeCount(List<Conversation> conversations) {
  var total = 0;
  for (final conversation in conversations) {
    if (!shouldShowNumericUnreadBadge(conversation)) continue;
    total += conversation.unreadCount;
  }
  return total;
}

int calculateNumericUnreadConversationCount(List<Conversation> conversations) {
  var total = 0;
  for (final conversation in conversations) {
    if (shouldShowNumericUnreadBadge(conversation)) total += 1;
  }
  return total;
}
