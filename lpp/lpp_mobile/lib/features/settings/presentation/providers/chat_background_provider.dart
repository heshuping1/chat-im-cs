import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

const _kSettingsBox = 'app_settings';
const _kGlobalChatBackgroundKey = 'chat_background_global';
const _kConversationChatBackgroundPrefix = 'chat_background_conversation_';

final chatBackgroundProvider = NotifierProvider.family<ChatBackgroundNotifier,
    ChatBackgroundSetting, String?>(
  ChatBackgroundNotifier.new,
);

class ChatBackgroundSetting {
  final String id;
  final String label;
  final int? colorValue;
  final String? imagePath;

  const ChatBackgroundSetting({
    required this.id,
    required this.label,
    this.colorValue,
    this.imagePath,
  });

  static const defaultSetting = ChatBackgroundSetting(
    id: 'default',
    label: '默认背景',
    colorValue: 0xFFEFEFEF,
  );

  Color get color => Color(colorValue ?? defaultSetting.colorValue!);
  bool get hasImage => imagePath != null && imagePath!.isNotEmpty;

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'colorValue': colorValue,
        'imagePath': imagePath,
      };

  factory ChatBackgroundSetting.fromJson(Map<String, dynamic> json) {
    return ChatBackgroundSetting(
      id: json['id'] as String? ?? defaultSetting.id,
      label: json['label'] as String? ?? defaultSetting.label,
      colorValue: json['colorValue'] as int?,
      imagePath: json['imagePath'] as String?,
    );
  }
}

class ChatBackgroundNotifier
    extends FamilyNotifier<ChatBackgroundSetting, String?> {
  @override
  ChatBackgroundSetting build(String? conversationId) {
    final box = Hive.box<String>(_kSettingsBox);
    final raw = box.get(_keyFor(conversationId)) ??
        (conversationId == null ? null : box.get(_kGlobalChatBackgroundKey));
    if (raw == null || raw.isEmpty) {
      return ChatBackgroundSetting.defaultSetting;
    }
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return ChatBackgroundSetting.fromJson(decoded);
    } catch (_) {
      return ChatBackgroundSetting.defaultSetting;
    }
  }

  Future<void> setBackground(ChatBackgroundSetting setting) async {
    state = setting;
    final box = Hive.box<String>(_kSettingsBox);
    await box.put(_keyFor(arg), jsonEncode(setting.toJson()));
  }

  Future<void> resetToDefault() async {
    final box = Hive.box<String>(_kSettingsBox);
    await box.delete(_keyFor(arg));
    if (arg == null || arg!.isEmpty) {
      state = ChatBackgroundSetting.defaultSetting;
      return;
    }
    final raw = box.get(_kGlobalChatBackgroundKey);
    if (raw == null || raw.isEmpty) {
      state = ChatBackgroundSetting.defaultSetting;
      return;
    }
    try {
      state = ChatBackgroundSetting.fromJson(
        jsonDecode(raw) as Map<String, dynamic>,
      );
    } catch (_) {
      state = ChatBackgroundSetting.defaultSetting;
    }
  }

  String _keyFor(String? conversationId) {
    if (conversationId == null || conversationId.isEmpty) {
      return _kGlobalChatBackgroundKey;
    }
    return '$_kConversationChatBackgroundPrefix$conversationId';
  }
}
