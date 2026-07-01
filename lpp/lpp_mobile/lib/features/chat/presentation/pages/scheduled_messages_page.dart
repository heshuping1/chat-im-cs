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
  String? _editingId;

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
    if (spaceId.isEmpty || _cancelingId != null || !message.canCancel) return;
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

  Future<void> _edit(ScheduledMessage message) async {
    final spaceId = ref.read(currentSpaceProvider)?.spaceId ?? '';
    if (spaceId.isEmpty || _editingId != null || !_canEditText(message)) {
      return;
    }
    final result = await showModalBottomSheet<_ScheduledEditResult>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) => _ScheduledMessageEditSheet(message: message),
    );
    if (result == null || !mounted) return;
    final text = result.text.trim();
    if (text.isEmpty) {
      AppToast.error(context, '定时消息内容不能为空');
      return;
    }
    final now = DateTime.now();
    if (!result.scheduledAt.isAfter(now.add(const Duration(minutes: 1)))) {
      AppToast.error(context, '请选择至少 1 分钟后的时间');
      return;
    }
    if (result.scheduledAt.isAfter(now.add(const Duration(days: 14)))) {
      AppToast.error(context, '定时发送最多支持 14 天内');
      return;
    }

    setState(() => _editingId = message.scheduledMessageId);
    try {
      await ref.read(scheduledMessagesControllerProvider(spaceId)).updateText(
            scheduledMessageId: message.scheduledMessageId,
            text: text,
            scheduledAt: result.scheduledAt,
          );
      if (!mounted) return;
      _reload();
    } catch (_) {
      if (mounted) {
        AppToast.error(context, '更新失败，请稍后重试');
      }
    } finally {
      if (mounted) {
        setState(() => _editingId = null);
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
                final editing = _editingId == item.scheduledMessageId;
                final canEditText = _canEditText(item);
                return ListTile(
                  onTap: canEditText ? () => _edit(item) : null,
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
                  trailing: _buildActions(
                    item,
                    canEditText: canEditText,
                    editing: editing,
                    canceling: canceling,
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
      2 => '已取消',
      3 => '发送失败',
      4 => '投递中',
      _ => '状态 ${item.status}',
    };
  }

  Widget? _buildActions(
    ScheduledMessage item, {
    required bool canEditText,
    required bool editing,
    required bool canceling,
  }) {
    if (!canEditText && !item.canCancel) return null;
    if (editing || canceling) {
      return const SizedBox(
        width: 18,
        height: 18,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (canEditText)
          TextButton(
            onPressed: () => _edit(item),
            child: const Text('编辑'),
          ),
        if (item.canCancel)
          TextButton(
            onPressed: () => _cancel(item),
            child: const Text('取消'),
          ),
      ],
    );
  }

  bool _canEditText(ScheduledMessage item) {
    return item.canEdit && item.type == MessageType.text;
  }

  String _formatDateTime(DateTime value) {
    final local = value.toLocal();
    String two(int number) => number.toString().padLeft(2, '0');
    return '${local.year}-${two(local.month)}-${two(local.day)} '
        '${two(local.hour)}:${two(local.minute)}';
  }
}

class _ScheduledEditResult {
  final String text;
  final DateTime scheduledAt;

  const _ScheduledEditResult({
    required this.text,
    required this.scheduledAt,
  });
}

class _ScheduledMessageEditSheet extends StatefulWidget {
  final ScheduledMessage message;

  const _ScheduledMessageEditSheet({required this.message});

  @override
  State<_ScheduledMessageEditSheet> createState() =>
      _ScheduledMessageEditSheetState();
}

class _ScheduledMessageEditSheetState
    extends State<_ScheduledMessageEditSheet> {
  late final TextEditingController _textController;
  late DateTime _scheduledAt;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController(
      text: widget.message.body.text?.trim() ?? '',
    );
    _scheduledAt = widget.message.scheduledAt.toLocal();
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _pickTime() async {
    final now = DateTime.now();
    final firstDate = DateTime(now.year, now.month, now.day);
    final lastDate = now.add(const Duration(days: 14));
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _scheduledAt.isBefore(firstDate) ? firstDate : _scheduledAt,
      firstDate: firstDate,
      lastDate: lastDate,
    );
    if (pickedDate == null || !mounted) return;
    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_scheduledAt),
    );
    if (pickedTime == null || !mounted) return;
    setState(() {
      _scheduledAt = DateTime(
        pickedDate.year,
        pickedDate.month,
        pickedDate.day,
        pickedTime.hour,
        pickedTime.minute,
      );
    });
  }

  void _submit() {
    Navigator.of(context).pop(
      _ScheduledEditResult(
        text: _textController.text,
        scheduledAt: _scheduledAt,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: 36,
            height: 4,
            margin: const EdgeInsets.only(bottom: 14),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .onSurface
                  .withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const Text(
            '编辑定时消息',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _textController,
            minLines: 3,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: '消息内容',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('发送时间'),
            subtitle: Text(_formatDateTime(_scheduledAt)),
            trailing: TextButton(
              onPressed: _pickTime,
              child: const Text('修改'),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _submit,
            child: const Text('保存'),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime value) {
    String two(int number) => number.toString().padLeft(2, '0');
    return '${value.year}-${two(value.month)}-${two(value.day)} '
        '${two(value.hour)}:${two(value.minute)}';
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
