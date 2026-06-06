import 'conversation.dart';

/// A cursor page of conversations in the active space.
class ConversationsPage {
  final List<Conversation> items;
  final String? nextCursor;

  const ConversationsPage({
    required this.items,
    this.nextCursor,
  });
}
