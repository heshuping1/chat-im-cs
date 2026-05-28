import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/chat_input_settings_provider.dart';

void main() {
  group('chatEnterToSendProvider', () {
    late Directory tempDir;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('lpp-chat-settings-');
      Hive.init(tempDir.path);
      await Hive.openBox<String>('app_settings');
    });

    tearDown(() async {
      await Hive.close();
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    test('defaults to disabled', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      expect(container.read(chatEnterToSendProvider), isFalse);
    });

    test('persists enabled value locally for repeat launches', () async {
      final firstContainer = ProviderContainer();
      addTearDown(firstContainer.dispose);

      await firstContainer
          .read(chatEnterToSendProvider.notifier)
          .setEnabled(true);

      final secondContainer = ProviderContainer();
      addTearDown(secondContainer.dispose);

      expect(secondContainer.read(chatEnterToSendProvider), isTrue);
      expect(Hive.box<String>('app_settings').get('chat_enter_to_send'), 'true');
    });
  });
}
