import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/services/mention_composer.dart';

void main() {
  group('MentionComposer', () {
    test('builds all-member and user mentions from intact tokens', () {
      final draft = MentionComposerDraft(
        text: '@所有人 请 @张三 看一下',
        tokens: const [
          MentionComposerToken.all(label: '@所有人'),
          MentionComposerToken.user(userId: 'user-2', label: '@张三'),
        ],
      );

      expect(draft.mentions, const [
        Mention.all(offset: 0, length: 4),
        Mention.user(userId: 'user-2', offset: 7, length: 3),
      ]);
    });

    test('drops mention token when the visible label is edited away', () {
      final draft = MentionComposerDraft(
        text: '@所有 请 @张三 看一下',
        tokens: const [
          MentionComposerToken.all(label: '@所有人'),
          MentionComposerToken.user(userId: 'user-2', label: '@张三'),
        ],
      );

      expect(draft.mentions, const [
        Mention.user(userId: 'user-2', offset: 6, length: 3),
      ]);
    });

    test('inserts selected member at cursor with a trailing space', () {
      final draft = MentionComposerDraft.empty().insertUser(
        userId: 'user-3',
        displayName: '李四',
        selectionStart: 0,
        selectionEnd: 0,
      );

      expect(draft.text, '@李四 ');
      expect(draft.mentions, const [
        Mention.user(userId: 'user-3', offset: 0, length: 3),
      ]);
    });
  });
}
