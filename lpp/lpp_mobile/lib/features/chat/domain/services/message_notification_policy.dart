enum ChatAppVisibility {
  foreground,
  background,
}

bool shouldShowSystemMessageNotification({
  required ChatAppVisibility visibility,
  required String incomingConversationId,
  required String? activeConversationId,
  required bool isMuted,
  required bool isSelf,
}) {
  if (isSelf || isMuted) return false;
  if (visibility == ChatAppVisibility.foreground) return false;
  return true;
}
