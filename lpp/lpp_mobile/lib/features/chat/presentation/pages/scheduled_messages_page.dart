import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/scheduled_messages_controller.dart';

class ScheduledMessagesPage extends ConsumerStatefulWidget {
  final String conversationId;

  const ScheduledMessagesPage({
    super.key,
    required this.conversationId,
  });

  @override
  ConsumerState<ScheduledMessagesPage> createState() =>
      _ScheduledMessagesPageState();
}

class _ScheduledMessagesPageState extends ConsumerState<ScheduledMessagesPage> {
  Future<List<ScheduledMessage>>? _future;
  String? _cancelingId;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    final spaceId = ref.read(currentSpaceProvider)?.spaceId ?? '';
    setState(() {
      _future = spaceId.isEmpty
          ? Future.value(const <ScheduledMessage>[])
          : ref
              .read(scheduledMessagesControllerProvider(spaceId))
              .load(widget.conversationId);
    });
  }

  Future<void> _cancel(ScheduledMessage message) async {
    final spaceId = ref.read(currentSpaceProvider)?.spaceId ?? '';
    if (spaceId.isEmpty || _cancelingId != null) return;
    setState(() => _cancelingId = message.scheduledMessageId);
    try {
      await ref
          .read(scheduledMessagesControllerProvider(spaceId))
          .cancel(message.scheduledMessageId);
      if (!mounted) return;
      AppToast.success(context, '已取消定时消息');
      _reload();
    } catch (_) {
      if (mounted) {
        AppToast.error(context, '取消失败，请稍后重试');
      }
    } finally {
      if (mounted) {
        setState(() => _cancelingId = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          '定时消息',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
      ),
      body: FutureBuilder<List<ScheduledMessage>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _StateView(
              icon: Icons.cloud_off_outlined,
              title: '定时消息加载失败',
              actionLabel: '重试',
              onAction: _reload,
            );
          }
          final items = snapshot.data ?? const <ScheduledMessage>[];
          if (items.isEmpty) {
            return const _StateView(
              icon: Icons.schedule_send_outlined,
              title: '暂无定时消息',
              subtitle: '在输入栏选择定时发送后，会在这里统一管理。',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final item = items[index];
                final canceling = _cancelingId == item.scheduledMessageId;
                return ListTile(
                  leading: _ScheduledMessageIcon(type: item.type),
                  title: Text(
                    _previewText(item),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    '${_formatDateTime(item.scheduledAt)} · ${_statusText(item)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: TextButton(
                    onPressed: canceling ? null : () => _cancel(item),
                    child: canceling
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('取消'),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  String _previewText(ScheduledMessage item) {
    final text = item.body.text?.trim();
    if (text != null && text.isNotEmpty) return text;
    return switch (item.type) {
      MessageType.image => '[图片]',
      MessageType.video => '[视频]',
      MessageType.voice => '[语音]',
      MessageType.file => item.body.file?.fileName ?? '[文件]',
      MessageType.location => '[位置]',
      MessageType.contactCard => '[名片]',
      MessageType.callLog => '[通话记录]',
      MessageType.markdown => '[富文本]',
      MessageType.event => '[系统消息]',
      MessageType.text => '[文本]',
    };
  }

  String _statusText(ScheduledMessage item) {
    if (item.failureReason?.trim().isNotEmpty == true) {
      return item.failureReason!.trim();
    }
    return switch (item.status) {
      0 => '等待发送',
      1 => '已发送',
      2 => '发送失败',
      3 => '已取消',
      _ => '状态 ${item.status}',
    };
  }

  String _formatDateTime(DateTime value) {
    final local = value.toLocal();
    String two(int number) => number.toString().padLeft(2, '0');
    return '${local.year}-${two(local.month)}-${two(local.day)} '
        '${two(local.hour)}:${two(local.minute)}';
  }
}

class _ScheduledMessageIcon extends StatelessWidget {
  final MessageType type;

  const _ScheduledMessageIcon({required this.type});

  @override
  Widget build(BuildContext context) {
    final icon = switch (type) {
      MessageType.image => Icons.image_outlined,
      MessageType.video => Icons.videocam_outlined,
      MessageType.voice => Icons.keyboard_voice_outlined,
      MessageType.file => Icons.insert_drive_file_outlined,
      MessageType.location => Icons.location_on_outlined,
      MessageType.contactCard => Icons.badge_outlined,
      MessageType.callLog => Icons.call_outlined,
      _ => Icons.schedule_send_outlined,
    };
    return CircleAvatar(
      backgroundColor: const Color(0xFFE8F7F1),
      foregroundColor: const Color(0xFF07C160),
      child: Icon(icon, size: 20),
    );
  }
}

class _StateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _StateView({
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: const Color(0xFF98A2B3)),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF667085),
                ),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 16),
              FilledButton(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
