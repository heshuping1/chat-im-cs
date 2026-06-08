import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/services/chat_draft_hydration_policy.dart';

void main() {
  group('ChatDraftHydrationPolicy', () {
    const policy = ChatDraftHydrationPolicy();

    test(
      'allows restoring draft before local input in the same conversation',
      () {
        final shouldHydrate = policy.shouldHydrate(
          currentConversationId: 'chat-1',
          previousConversationId: 'chat-1',
          incomingDraft: 'offline draft',
          currentInput: '',
          hasLocalInputInteraction: false,
          wasClearedBySend: false,
        );

        expect(shouldHydrate, isTrue);
      },
    );

    test('blocks stale draft after local editing', () {
      final shouldHydrate = policy.shouldHydrate(
        currentConversationId: 'chat-1',
        previousConversationId: 'chat-1',
        incomingDraft: 'old draft',
        currentInput: 'new input',
        hasLocalInputInteraction: true,
        wasClearedBySend: false,
      );

      expect(shouldHydrate, isFalse);
    });

    test('blocks stale draft after send clears the input', () {
      final shouldHydrate = policy.shouldHydrate(
        currentConversationId: 'chat-1',
        previousConversationId: 'chat-1',
        incomingDraft: 'hello',
        currentInput: '',
        hasLocalInputInteraction: true,
        wasClearedBySend: true,
      );

      expect(shouldHydrate, isFalse);
    });

    test('allows restoring draft after switching to a new conversation', () {
      final shouldHydrate = policy.shouldHydrate(
        currentConversationId: 'chat-2',
        previousConversationId: 'chat-1',
        incomingDraft: 'chat two draft',
        currentInput: '',
        hasLocalInputInteraction: false,
        wasClearedBySend: false,
      );

      expect(shouldHydrate, isTrue);
    });
  });
}
