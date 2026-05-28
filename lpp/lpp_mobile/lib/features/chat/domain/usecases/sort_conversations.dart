import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';

/// 排序会话列表：置顶在前，按 lastActivityAt 降序
List<Conversation> sortConversations(List<Conversation> conversations) {
  final sorted = List<Conversation>.from(conversations);
  sorted.sort((a, b) {
    // 置顶优先
    if (a.isPinned != b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    // 按最后活动时间降序
    final aTime = a.lastActivityAt;
    final bTime = b.lastActivityAt;
    if (aTime == null && bTime == null) return 0;
    if (aTime == null) return 1;
    if (bTime == null) return -1;
    return bTime.compareTo(aTime);
  });
  return sorted;
}
