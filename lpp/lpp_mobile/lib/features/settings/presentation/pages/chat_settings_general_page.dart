import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/chat_input_settings_provider.dart';

class ChatSettingsGeneralPage extends ConsumerStatefulWidget {
  const ChatSettingsGeneralPage({super.key});

  @override
  ConsumerState<ChatSettingsGeneralPage> createState() =>
      _ChatSettingsGeneralPageState();
}

class _ChatSettingsGeneralPageState
    extends ConsumerState<ChatSettingsGeneralPage> {
  @override
  Widget build(BuildContext context) {
    final enterToSend = ref.watch(chatEnterToSendProvider);

    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, '聊天'),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          SettingGroup(
            children: [
              SettingTile(
                label: '聊天背景',
                onTap: () => context.push('/chat-background'),
              ),
              SettingSwitchTile(
                label: '回车键发送消息',
                value: enterToSend,
                onChanged: (v) =>
                    ref.read(chatEnterToSendProvider.notifier).setEnabled(v),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
