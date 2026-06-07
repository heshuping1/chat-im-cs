enum ChatSendAction {
  text,
  media,
  file,
  voice,
  location,
  contactCard,
  retryFailed,
}

bool shouldBlockChatSendAction(
  ChatSendAction action, {
  required bool isSingleActionRunning,
}) {
  if (!isSingleActionRunning) return false;
  return switch (action) {
    ChatSendAction.text ||
    ChatSendAction.media ||
    ChatSendAction.file ||
    ChatSendAction.voice ||
    ChatSendAction.contactCard =>
      false,
    ChatSendAction.location || ChatSendAction.retryFailed => true,
  };
}
