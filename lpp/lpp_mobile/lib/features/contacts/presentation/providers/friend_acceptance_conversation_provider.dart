import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/chat_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/contacts/application/friend_acceptance_conversation_service.dart';
import 'package:lpp_mobile/features/contacts/data/services/friend_acceptance_conversation_adapters.dart';

final friendAcceptanceConversationServiceProvider =
    Provider<FriendAcceptanceConversationService>((ref) {
  return FriendAcceptanceConversationService(
    gateway: DioFriendAcceptanceConversationGateway(ref.watch(dioProvider)),
    store: ChatLocalFriendAcceptanceConversationStore.create(),
  );
});

Future<void> ensureFriendAcceptanceConversation(
  WidgetRef ref,
  FriendAcceptanceConversationDraft draft,
) async {
  await _ensureFriendAcceptanceConversation(
    space: ref.read(currentSpaceProvider),
    service: ref.read(friendAcceptanceConversationServiceProvider),
    invalidateConversationState: (spaceId, conversationId) {
      ref.invalidate(conversationsProvider(spaceId));
      ref.invalidate(chatProvider((spaceId, conversationId, false)));
    },
    draft: draft,
  );
}

Future<void> ensureFriendAcceptanceConversationFromProvider(
  Ref ref,
  FriendAcceptanceConversationDraft draft,
) async {
  await _ensureFriendAcceptanceConversation(
    space: ref.read(currentSpaceProvider),
    service: ref.read(friendAcceptanceConversationServiceProvider),
    invalidateConversationState: (spaceId, conversationId) {
      ref.invalidate(conversationsProvider(spaceId));
      ref.invalidate(chatProvider((spaceId, conversationId, false)));
    },
    draft: draft,
  );
}

Future<void> _ensureFriendAcceptanceConversation({
  required SpaceContext? space,
  required FriendAcceptanceConversationService service,
  required void Function(String spaceId, String conversationId)
      invalidateConversationState,
  required FriendAcceptanceConversationDraft draft,
}) async {
  if (space == null) return;

  final result = await service.ensureConversation(
    spaceId: space.spaceId,
    currentUserId: space.userId,
    draft: draft,
  );
  if (result == null) return;

  invalidateConversationState(space.spaceId, result.conversationId);
}
