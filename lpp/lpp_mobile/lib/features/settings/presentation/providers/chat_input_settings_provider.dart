import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

const _kSettingsBox = 'app_settings';
const _kEnterToSendKey = 'chat_enter_to_send';

final chatEnterToSendProvider = NotifierProvider<ChatEnterToSendNotifier, bool>(
  ChatEnterToSendNotifier.new,
);

class ChatEnterToSendNotifier extends Notifier<bool> {
  @override
  bool build() {
    try {
      final box = Hive.box<String>(_kSettingsBox);
      return box.get(_kEnterToSendKey, defaultValue: 'false') == 'true';
    } catch (_) {
      return false;
    }
  }

  Future<void> setEnabled(bool enabled) async {
    state = enabled;
    try {
      final box = Hive.box<String>(_kSettingsBox);
      await box.put(_kEnterToSendKey, enabled ? 'true' : 'false');
    } catch (_) {}
  }
}
