typedef EnsureDirectConversationId = Future<String> Function();

Future<String> resolveCallLogChatId({
  required String activeConversationId,
  required EnsureDirectConversationId ensureDirectConversationId,
  required bool isPendingDirectChat,
}) {
  if (!isPendingDirectChat) {
    return Future.value(activeConversationId);
  }
  return ensureDirectConversationId();
}
