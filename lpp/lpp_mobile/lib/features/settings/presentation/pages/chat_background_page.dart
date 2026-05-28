import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/chat_background_provider.dart';

class ChatBackgroundPage extends ConsumerStatefulWidget {
  final String? conversationId;

  const ChatBackgroundPage({super.key, this.conversationId});

  @override
  ConsumerState<ChatBackgroundPage> createState() => _ChatBackgroundPageState();
}

class _ChatBackgroundPageState extends ConsumerState<ChatBackgroundPage> {
  final _imagePicker = ImagePicker();

  static const _backgrounds = [
    ChatBackgroundSetting(id: 'default', label: '默认背景', colorValue: 0xFFEFEFEF),
    ChatBackgroundSetting(id: 'white', label: '纯白', colorValue: 0xFFFFFFFF),
    ChatBackgroundSetting(
        id: 'light-gray', label: '浅灰', colorValue: 0xFFF5F5F5),
    ChatBackgroundSetting(id: 'beige', label: '米白', colorValue: 0xFFF9F6F0),
    ChatBackgroundSetting(
        id: 'light-blue', label: '浅蓝', colorValue: 0xFFE8F4F8),
    ChatBackgroundSetting(
        id: 'light-green', label: '浅绿', colorValue: 0xFFE8F5E9),
    ChatBackgroundSetting(
        id: 'light-pink', label: '浅粉', colorValue: 0xFFFCE4EC),
    ChatBackgroundSetting(
        id: 'light-purple', label: '浅紫', colorValue: 0xFFF3E5F5),
  ];

  bool get _isConversationScoped =>
      widget.conversationId != null && widget.conversationId!.isNotEmpty;

  Future<void> _select(ChatBackgroundSetting setting) async {
    await ref
        .read(chatBackgroundProvider(widget.conversationId).notifier)
        .setBackground(setting);
  }

  Future<void> _pickImage() async {
    final image = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
    );
    if (image == null) return;
    await _select(ChatBackgroundSetting(
      id: 'image:${image.path}',
      label: '自定义图片',
      imagePath: image.path,
    ));
  }

  Future<void> _resetConversationBackground() async {
    await ref
        .read(chatBackgroundProvider(widget.conversationId).notifier)
        .resetToDefault();
  }

  @override
  Widget build(BuildContext context) {
    final selected = ref.watch(chatBackgroundProvider(widget.conversationId));

    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(
        context,
        _isConversationScoped ? '当前聊天背景' : '聊天背景',
      ),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          SettingGroup(
            children: _backgrounds.map((bg) {
              final isSelected = selected.id == bg.id && !selected.hasImage;
              return InkWell(
                onTap: () => _select(bg),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: bg.color,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                              color: Theme.of(context).colorScheme.outline),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(bg.label,
                            style: const TextStyle(
                                fontSize: 15, color: Color(0xFF2C2C2C))),
                      ),
                      if (isSelected)
                        const Icon(Icons.check,
                            color: Color(0xFF00B27A), size: 20),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          SettingGroup(
            children: [
              SettingTile(
                label: selected.hasImage ? '更换自定义图片' : '从相册选择图片',
                value: selected.hasImage ? '已设置' : null,
                onTap: _pickImage,
              ),
              if (_isConversationScoped)
                SettingTile(
                  label: '使用全局聊天背景',
                  showArrow: false,
                  onTap: _resetConversationBackground,
                ),
            ],
          ),
        ],
      ),
    );
  }
}
