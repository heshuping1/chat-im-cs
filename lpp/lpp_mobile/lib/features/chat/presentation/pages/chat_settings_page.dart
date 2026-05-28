import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/conversation_actions_controller.dart';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const _text = Color(0xFF2C2C2C);
const _primary = Color(0xFF00B27A);

// ---------------------------------------------------------------------------
// ChatSettingsPage
// ---------------------------------------------------------------------------
class ChatSettingsPage extends ConsumerStatefulWidget {
  final String chatId;

  const ChatSettingsPage({super.key, required this.chatId});

  @override
  ConsumerState<ChatSettingsPage> createState() => _ChatSettingsPageState();
}

class _ChatSettingsPageState extends ConsumerState<ChatSettingsPage> {
  bool _mutedNotification = false;
  bool _pinned = false;
  bool _isLoading = true;
  String? _peerUserId;
  String? _peerName;
  String? _peerAvatarUrl;

  @override
  void initState() {
    super.initState();
    _loadChatDetail();
  }

  Future<void> _loadChatDetail() async {
    try {
      final dio = ref.read(dioProvider);
      final resp =
          await dio.get('/api/client/v1/direct-chats/${widget.chatId}');
      final data = resp.data?['data'] as Map<String, dynamic>?;
      if (data != null && mounted) {
        setState(() {
          _mutedNotification = data['isMuted'] as bool? ?? false;
          _pinned = data['isPinned'] as bool? ?? false;
          _peerUserId = data['peerUserId'] as String?;
          _peerName = data['peerDisplayName'] as String?;
          _peerAvatarUrl = data['peerAvatarUrl'] as String?;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleMute(bool value) async {
    setState(() => _mutedNotification = value);
    try {
      await ref.read(conversationActionsControllerProvider).setMuted(
            widget.chatId,
            muted: value,
            isGroup: false,
          );
    } catch (_) {
      if (mounted) setState(() => _mutedNotification = !value);
    }
  }

  Future<void> _togglePin(bool value) async {
    setState(() => _pinned = value);
    try {
      await ref.read(conversationActionsControllerProvider).setPinned(
            widget.chatId,
            pinned: value,
            isGroup: false,
          );
    } catch (_) {
      if (mounted) setState(() => _pinned = !value);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: _text, size: 18),
          onPressed: () => context.pop(),
        ),
        title: const Text('聊天详情',
            style: TextStyle(
                fontSize: 17, fontWeight: FontWeight.w500, color: _text)),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: _primary))
          : ListView(
              children: [
                const SizedBox(height: 8),
                _buildMembersSection(context),
                const SizedBox(height: 8),
                _buildSection([
                  _SettingItem(
                    icon: Icons.search,
                    label: '查找聊天内容',
                    showArrow: true,
                    onTap: () => context.push('/search'),
                  ),
                ]),
                const SizedBox(height: 8),
                _buildSection([
                  _SwitchItem(
                    label: '消息免打扰',
                    value: _mutedNotification,
                    onChanged: _toggleMute,
                  ),
                  const _Divider(),
                  _SwitchItem(
                    label: '置顶聊天',
                    value: _pinned,
                    onChanged: _togglePin,
                  ),
                ]),
                const SizedBox(height: 8),
                _buildSection([
                  _SettingItem(
                    label: '设置当前聊天背景',
                    showArrow: true,
                    onTap: () => context.push(
                        '/chat-background?conversationId=${widget.chatId}'),
                  ),
                ]),
                const SizedBox(height: 8),
                _buildSection([
                  _SettingItem(
                    label: '清空聊天记录',
                    onTap: () => _showClearSheet(context),
                  ),
                ]),
                const SizedBox(height: 8),
                _buildSection([
                  _SettingItem(
                    label: '投诉',
                    showArrow: true,
                    onTap: () => _showComplaintSheet(context),
                  ),
                ]),
                const SizedBox(height: 24),
              ],
            ),
    );
  }

  Widget _buildMembersSection(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_peerUserId != null)
            GestureDetector(
              onTap: () => context.push('/profile/$_peerUserId'),
              child: Column(
                children: [
                  UserAvatar(
                    avatarUrl: _peerAvatarUrl,
                    name: _peerName ?? '?',
                    size: 48,
                    borderRadius: 8,
                  ),
                  const SizedBox(height: 4),
                  SizedBox(
                    width: 56,
                    child: Text(
                      _peerName ?? '联系人',
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(width: 16),
          GestureDetector(
            onTap: () => context.push('/create-group'),
            child: Column(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300, width: 1.5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(Icons.add, size: 22, color: Colors.grey.shade400),
                ),
                const SizedBox(height: 4),
                const SizedBox(
                  width: 56,
                  child: Text('添加',
                      style: TextStyle(fontSize: 11, color: Colors.grey),
                      textAlign: TextAlign.center),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection(List<Widget> children) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Column(children: children),
    );
  }

  void _showClearSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('清空聊天记录',
                  style: TextStyle(color: Colors.red),
                  textAlign: TextAlign.center),
              onTap: () {
                Navigator.pop(context);
                AppToast.success(context, '聊天记录已清空');
              },
            ),
            const Divider(height: 1),
            ListTile(
              title: const Text('取消',
                  style: TextStyle(color: Colors.grey),
                  textAlign: TextAlign.center),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  void _showComplaintSheet(BuildContext context) {
    final options = ['存在欺诈骗钱行为', '存在侵权行为', '发送不良信息', '骚扰他人'];
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ...options.map((opt) => Column(children: [
                  ListTile(
                    title: Text(opt, textAlign: TextAlign.center),
                    onTap: () {
                      Navigator.pop(context);
                      AppToast.success(context, '已提交投诉');
                    },
                  ),
                  const Divider(height: 1),
                ])),
            ListTile(
              title: const Text('取消',
                  style: TextStyle(color: Colors.grey),
                  textAlign: TextAlign.center),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helper widgets
// ---------------------------------------------------------------------------

class _SettingItem extends StatelessWidget {
  final IconData? icon;
  final String label;
  final bool showArrow;
  final VoidCallback? onTap;

  const _SettingItem({
    this.icon,
    required this.label,
    this.showArrow = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            if (icon != null) ...[
              Icon(icon, size: 20, color: Colors.grey.shade700),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Text(label,
                  style: const TextStyle(fontSize: 15, color: _text)),
            ),
            if (showArrow)
              Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 18),
          ],
        ),
      ),
    );
  }
}

class _SwitchItem extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SwitchItem({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child:
                Text(label, style: const TextStyle(fontSize: 15, color: _text)),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: _primary,
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 1,
      margin: const EdgeInsets.only(left: 16),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
    );
  }
}
