import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_draft_local_store.dart';

void main() {
  group('ChatDraftLocalStore', () {
    late Directory tempDir;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('lpp-chat-drafts-');
      Hive.init(tempDir.path);
    });

    tearDown(() async {
      await Hive.close();
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    test('isolates drafts by space user and conversation', () async {
      const store = ChatDraftLocalStore();

      await store.saveDraft(
        spaceId: 'space-a',
        userId: 'user-a',
        conversationId: 'chat-1',
        text: 'user a draft',
      );
      await store.saveDraft(
        spaceId: 'space-a',
        userId: 'user-b',
        conversationId: 'chat-1',
        text: 'user b draft',
      );

      expect(
        await store.readDraft(
          spaceId: 'space-a',
          userId: 'user-a',
          conversationId: 'chat-1',
        ),
        'user a draft',
      );
      expect(
        await store.readDraft(
          spaceId: 'space-a',
          userId: 'user-b',
          conversationId: 'chat-1',
        ),
        'user b draft',
      );
      expect(
        await store.readDraft(
          spaceId: 'space-b',
          userId: 'user-a',
          conversationId: 'chat-1',
        ),
        isNull,
      );
    });

    test('blank drafts clear the local ledger entry', () async {
      const store = ChatDraftLocalStore();
      await store.saveDraft(
        spaceId: 'space-a',
        userId: 'user-a',
        conversationId: 'chat-1',
        text: 'hello',
      );

      await store.saveDraft(
        spaceId: 'space-a',
        userId: 'user-a',
        conversationId: 'chat-1',
        text: '   ',
      );

      expect(
        await store.readDraft(
          spaceId: 'space-a',
          userId: 'user-a',
          conversationId: 'chat-1',
        ),
        isNull,
      );
    });
  });
}
