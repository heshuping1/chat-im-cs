import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';

/// 按关键词过滤会话列表（匹配 title 或 lastMessage.text）
List<Conversation> filterConversations(
  List<Conversation> conversations,
  String keyword,
) {
  final trimmed = keyword.trim();
  if (trimmed.isEmpty) return conversations;

  final lower = trimmed.toLowerCase();
  return conversations.where((c) {
    if (c.title.toLowerCase().contains(lower)) return true;
    final preview = c.lastMessage?.text;
    if (preview != null && preview.toLowerCase().contains(lower)) return true;
    return false;
  }).toList();
}

/// 普通消息首页只展示 direct/group，会话型在线客服线程由客服工作台承载。
List<Conversation> filterHomeConversations(
  List<Conversation> conversations, {
  Set<String> customerServiceConversationIds = const <String>{},
}) {
  return conversations
      .where((c) =>
          c.type != ConversationType.tempSession &&
          !customerServiceConversationIds.contains(c.conversationId))
      .toList(growable: false);
}
