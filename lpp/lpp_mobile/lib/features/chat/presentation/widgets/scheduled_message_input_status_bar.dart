import 'package:flutter/material.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';
import 'package:lpp_mobile/features/chat/presentation/models/scheduled_message_input_status.dart';

class ScheduledMessageInputStatusBar extends StatelessWidget {
  final ScheduledMessageInputStatus status;
  final ValueChanged<ScheduledMessage> onEditTask;
  final ValueChanged<ScheduledMessage> onCancelTask;
  final VoidCallback onClearLocalDraft;
  final VoidCallback onCancelEditing;

  const ScheduledMessageInputStatusBar({
    super.key,
    required this.status,
    required this.onEditTask,
    required this.onCancelTask,
    required this.onClearLocalDraft,
    required this.onCancelEditing,
  });

  @override
  Widget build(BuildContext context) {
    if (!status.isVisible) return const SizedBox.shrink();

    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(
          top: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 2, 8, 2),
        child: SizedBox(
          height: 38,
          child: Row(
            children: [
              Icon(
                Icons.schedule_outlined,
                size: 18,
                color: colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _labelFor(status),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
              if (status.kind == ScheduledMessageInputStatusKind.pendingTask)
                TextButton(
                  style: TextButton.styleFrom(
                    minimumSize: const Size(44, 32),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  onPressed: status.message?.type == MessageType.text
                      ? () => onEditTask(status.message!)
                      : null,
                  child: const Text('编辑'),
                ),
              if (status.kind == ScheduledMessageInputStatusKind.editingTask)
                TextButton(
                  style: TextButton.styleFrom(
                    minimumSize: const Size(44, 32),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  onPressed: onCancelEditing,
                  child: const Text('取消'),
                )
              else
                _TrailingClearButton(
                  status: status,
                  onClearLocalDraft: onClearLocalDraft,
                  onCancelTask: onCancelTask,
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _labelFor(ScheduledMessageInputStatus status) {
    final timeText = _formatScheduledTaskTime(status.scheduledAt!);
    return switch (status.kind) {
      ScheduledMessageInputStatusKind.localDraft => '将定时发送 · $timeText',
      ScheduledMessageInputStatusKind.pendingTask => '定时消息将于$timeText 发送',
      ScheduledMessageInputStatusKind.editingTask => '正在编辑定时消息 · $timeText',
      ScheduledMessageInputStatusKind.none => '',
    };
  }
}

class _TrailingClearButton extends StatelessWidget {
  final ScheduledMessageInputStatus status;
  final VoidCallback onClearLocalDraft;
  final ValueChanged<ScheduledMessage> onCancelTask;

  const _TrailingClearButton({
    required this.status,
    required this.onClearLocalDraft,
    required this.onCancelTask,
  });

  @override
  Widget build(BuildContext context) {
    if (status.canceling) {
      return const SizedBox(
        width: 36,
        height: 36,
        child: Center(
          child: SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    return IconButton(
      tooltip: '删除定时消息',
      visualDensity: VisualDensity.compact,
      constraints: const BoxConstraints.tightFor(width: 36, height: 36),
      padding: EdgeInsets.zero,
      onPressed: () {
        if (status.kind == ScheduledMessageInputStatusKind.localDraft) {
          onClearLocalDraft();
          return;
        }
        final message = status.message;
        if (message != null) onCancelTask(message);
      },
      icon: Icon(
        Icons.close_rounded,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
    );
  }
}

String _formatScheduledTaskTime(DateTime value) {
  final local = value.toLocal();
  final now = DateTime.now();
  final date = DateTime(local.year, local.month, local.day);
  final today = DateTime(now.year, now.month, now.day);
  final tomorrow = today.add(const Duration(days: 1));
  final minute = local.minute.toString().padLeft(2, '0');
  final time = '${local.hour.toString().padLeft(2, '0')}:$minute';
  if (date == today) return '今天 $time';
  if (date == tomorrow) return '明天 $time';
  return '${local.month}月${local.day}日 $time';
}
