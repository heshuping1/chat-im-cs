import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_draft_local_store.dart';

final chatDraftLocalStoreProvider = Provider<ChatDraftLocalStore>(
  (_) => const ChatDraftLocalStore(),
);

final chatDraftProvider =
    FutureProvider.family<String?, (String, String, String)>((ref, args) {
  final (spaceId, userId, conversationId) = args;
  if (spaceId.isEmpty || userId.isEmpty || conversationId.isEmpty) {
    return Future<String?>.value();
  }
  return ref.read(chatDraftLocalStoreProvider).readDraft(
        spaceId: spaceId,
        userId: userId,
        conversationId: conversationId,
      );
});
