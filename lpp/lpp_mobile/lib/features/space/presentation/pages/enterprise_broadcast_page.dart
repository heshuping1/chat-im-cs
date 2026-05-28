import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';

const _primary = Color(0xFF00B27A);

enum _EnterpriseBroadcastTarget {
  allMembers('全体人员', '员工 + 客户', Icons.apartment_outlined),
  staff('企业员工', '仅企业员工', Icons.badge_outlined),
  customers('企业客户', '已加入企业客户', Icons.people_alt_outlined),
  officialGroups('官方群', '企业官方群聊', Icons.groups_outlined);

  final String label;
  final String description;
  final IconData icon;

  const _EnterpriseBroadcastTarget(
    this.label,
    this.description,
    this.icon,
  );

  int get targetType => index + 1;
}

enum _EnterpriseBroadcastDelivery {
  now('立即发送'),
  scheduled('定时发送');

  final String label;

  const _EnterpriseBroadcastDelivery(this.label);
}

class EnterpriseBroadcastPage extends ConsumerStatefulWidget {
  const EnterpriseBroadcastPage({super.key});

  @override
  ConsumerState<EnterpriseBroadcastPage> createState() =>
      _EnterpriseBroadcastPageState();
}

class _EnterpriseBroadcastPageState
    extends ConsumerState<EnterpriseBroadcastPage> {
  final _contentController = TextEditingController();
  final _remarkController = TextEditingController();
  _EnterpriseBroadcastTarget _target = _EnterpriseBroadcastTarget.allMembers;
  _EnterpriseBroadcastDelivery _delivery = _EnterpriseBroadcastDelivery.now;
  bool _previewVisible = false;
  bool _previewLoading = false;
  bool _submitLoading = false;
  CsBroadcastPreview? _preview;
  CsBroadcastTask? _latestTask;

  @override
  void dispose() {
    _contentController.dispose();
    _remarkController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final space = ref.watch(currentSpaceProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final allowed = space?.isAdminOrAbove ?? false;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            size: 20,
            color: colorScheme.onSurface,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          '企业群发',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
        centerTitle: true,
      ),
      body: allowed
          ? ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              children: [
                const _EnterpriseBroadcastNotice(),
                const SizedBox(height: 12),
                _OfficialSenderCard(preview: _preview),
                const SizedBox(height: 12),
                _BroadcastTargetSection(
                  selected: _target,
                  onChanged: (target) => setState(() {
                    _target = target;
                    _previewVisible = false;
                  }),
                ),
                const SizedBox(height: 12),
                _BroadcastContentCard(
                  contentController: _contentController,
                  remarkController: _remarkController,
                  delivery: _delivery,
                  onDeliveryChanged: (delivery) => setState(() {
                    _delivery = delivery;
                    _previewVisible = false;
                  }),
                ),
                const SizedBox(height: 12),
                if (_previewVisible)
                  _EnterpriseBroadcastPreview(
                    target: _target,
                    content: _contentController.text.trim(),
                    delivery: _delivery,
                    preview: _preview,
                    task: _latestTask,
                  )
                else
                  const _EnterpriseBroadcastEmptyHistory(),
              ],
            )
          : const _EnterpriseBroadcastNoPermission(),
      bottomNavigationBar: allowed
          ? SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  border: Border(
                    top: BorderSide(color: Theme.of(context).dividerColor),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _previewLoading ? null : _showPreview,
                        icon: const Icon(Icons.visibility_outlined, size: 18),
                        label: Text(_previewLoading ? '预览中' : '预览'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: _primary,
                          minimumSize: const Size.fromHeight(46),
                          side: const BorderSide(color: _primary),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _submitLoading ? null : _submit,
                        icon: const Icon(Icons.send_outlined, size: 18),
                        label: Text(_submitLoading ? '提交中' : '提交发送'),
                        style: FilledButton.styleFrom(
                          backgroundColor: _primary,
                          minimumSize: const Size.fromHeight(46),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }

  Future<void> _showPreview() async {
    if (!_validateContent()) return;
    setState(() {
      _previewLoading = true;
      _previewVisible = true;
      _latestTask = null;
    });
    try {
      final preview = await ref
          .read(adminCustomerServiceRepositoryProvider)
          .previewBroadcast(
            targetType: _target.targetType,
          );
      if (!mounted) return;
      setState(() => _preview = preview);
    } catch (error) {
      if (!mounted) return;
      AppToast.error(context, _friendlyError(error));
    } finally {
      if (mounted) setState(() => _previewLoading = false);
    }
  }

  Future<void> _submit() async {
    if (!_validateContent()) return;
    setState(() {
      _submitLoading = true;
      _previewVisible = true;
    });
    try {
      final task = await ref
          .read(adminCustomerServiceRepositoryProvider)
          .createBroadcast(
            targetType: _target.targetType,
            messageType: 'text',
            body: {'text': _contentController.text.trim()},
            auditReason: _remarkController.text.trim(),
            officialAccountId: _preview?.sender?.officialAccountId,
          );
      if (!mounted) return;
      setState(() => _latestTask = task);
      AppToast.success(context, '企业群发任务已提交');
    } catch (error) {
      if (!mounted) return;
      AppToast.error(context, _friendlyError(error));
    } finally {
      if (mounted) setState(() => _submitLoading = false);
    }
  }

  bool _validateContent() {
    final content = _contentController.text.trim();
    if (content.isEmpty) {
      AppToast.info(context, '请输入群发内容');
      return false;
    }
    if (_delivery == _EnterpriseBroadcastDelivery.scheduled) {
      AppToast.info(context, '企业群发定时发送暂不在本期开放');
      return false;
    }
    return true;
  }

  String _friendlyError(Object error) {
    if (error is ServerError) return error.message;
    if (error is NetworkError) return error.message;
    if (error is AuthError) return '登录状态已失效，请重新登录';
    return '企业群发接口调用失败';
  }
}

class _EnterpriseBroadcastNotice extends StatelessWidget {
  const _EnterpriseBroadcastNotice();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F8EF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _primary.withValues(alpha: 0.22)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, color: _primary, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '企业群发将以服务端返回的官方账号发送，并记录审计。提交后可在任务状态中查看投递结果。',
              style: TextStyle(
                fontSize: 13,
                height: 1.35,
                color: colorScheme.onSurface.withValues(alpha: 0.72),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OfficialSenderCard extends StatelessWidget {
  final CsBroadcastPreview? preview;

  const _OfficialSenderCard({this.preview});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return _EnterpriseBroadcastCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionTitle(
            icon: Icons.verified_user_outlined,
            title: '发送身份',
            trailing: _StatusPill(
              label: preview?.sender == null ? '预览后确认' : '服务端返回',
              color: preview?.sender == null
                  ? colorScheme.onSurface.withValues(alpha: 0.52)
                  : _primary,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: _primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.campaign_outlined,
                  color: _primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      preview?.sender?.displayName ?? '企业默认官方账号',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '接收端应显示官方账号，不显示管理员个人身份',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withValues(alpha: 0.54),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BroadcastTargetSection extends StatelessWidget {
  final _EnterpriseBroadcastTarget selected;
  final ValueChanged<_EnterpriseBroadcastTarget> onChanged;

  const _BroadcastTargetSection({
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return _EnterpriseBroadcastCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(
            icon: Icons.track_changes_outlined,
            title: '目标范围',
          ),
          const SizedBox(height: 12),
          ..._EnterpriseBroadcastTarget.values.map((target) {
            final isSelected = target == selected;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _TargetOptionTile(
                target: target,
                selected: isSelected,
                onTap: () => onChanged(target),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _TargetOptionTile extends StatelessWidget {
  final _EnterpriseBroadcastTarget target;
  final bool selected;
  final VoidCallback onTap;

  const _TargetOptionTile({
    required this.target,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: selected
          ? _primary.withValues(alpha: 0.08)
          : Theme.of(context).scaffoldBackgroundColor,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? _primary : Theme.of(context).dividerColor,
            ),
          ),
          child: Row(
            children: [
              Icon(
                target.icon,
                color: selected ? _primary : colorScheme.onSurface,
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      target.label,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight:
                            selected ? FontWeight.w600 : FontWeight.w500,
                        color: selected ? _primary : colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      target.description,
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withValues(alpha: 0.52),
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                '--',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface.withValues(alpha: 0.48),
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                selected
                    ? Icons.radio_button_checked
                    : Icons.radio_button_unchecked,
                color: selected
                    ? _primary
                    : colorScheme.onSurface.withValues(alpha: 0.34),
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BroadcastContentCard extends StatelessWidget {
  final TextEditingController contentController;
  final TextEditingController remarkController;
  final _EnterpriseBroadcastDelivery delivery;
  final ValueChanged<_EnterpriseBroadcastDelivery> onDeliveryChanged;

  const _BroadcastContentCard({
    required this.contentController,
    required this.remarkController,
    required this.delivery,
    required this.onDeliveryChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return _EnterpriseBroadcastCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(
            icon: Icons.edit_note_outlined,
            title: '消息内容',
          ),
          const SizedBox(height: 12),
          TextField(
            controller: contentController,
            minLines: 5,
            maxLines: 8,
            maxLength: 1000,
            style: TextStyle(fontSize: 14, color: colorScheme.onSurface),
            decoration: _inputDecoration(
              context,
              hintText: '输入要以官方账号发送的企业群发内容',
            ),
          ),
          const SizedBox(height: 10),
          SegmentedButton<_EnterpriseBroadcastDelivery>(
            segments: _EnterpriseBroadcastDelivery.values
                .map(
                  (item) => ButtonSegment<_EnterpriseBroadcastDelivery>(
                    value: item,
                    icon: Icon(
                      item == _EnterpriseBroadcastDelivery.now
                          ? Icons.bolt_outlined
                          : Icons.schedule_outlined,
                    ),
                    label: Text(item.label),
                  ),
                )
                .toList(growable: false),
            selected: {delivery},
            onSelectionChanged: (selected) => onDeliveryChanged(selected.first),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: remarkController,
            minLines: 2,
            maxLines: 3,
            maxLength: 200,
            style: TextStyle(fontSize: 14, color: colorScheme.onSurface),
            decoration: _inputDecoration(
              context,
              hintText: '内部备注，便于后续审计和追溯（选填）',
            ),
          ),
        ],
      ),
    );
  }
}

class _EnterpriseBroadcastPreview extends StatelessWidget {
  final _EnterpriseBroadcastTarget target;
  final String content;
  final _EnterpriseBroadcastDelivery delivery;
  final CsBroadcastPreview? preview;
  final CsBroadcastTask? task;

  const _EnterpriseBroadcastPreview({
    required this.target,
    required this.content,
    required this.delivery,
    this.preview,
    this.task,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return _EnterpriseBroadcastCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(
            icon: Icons.preview_outlined,
            title: '发送预览',
          ),
          const SizedBox(height: 12),
          _PreviewRow(
            label: '发送身份',
            value: preview?.sender?.displayName ?? '企业默认官方账号',
          ),
          _PreviewRow(label: '目标范围', value: target.label),
          _PreviewRow(
            label: '预计人数',
            value: preview == null ? '--' : '${preview!.recipientCount}',
          ),
          _PreviewRow(label: '发送方式', value: delivery.label),
          if (task != null)
            _PreviewRow(label: '任务状态', value: task!.statusLabel),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Text(
              content,
              style: TextStyle(
                fontSize: 14,
                height: 1.4,
                color: colorScheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EnterpriseBroadcastEmptyHistory extends StatelessWidget {
  const _EnterpriseBroadcastEmptyHistory();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return _EnterpriseBroadcastCard(
      child: Row(
        children: [
          Icon(
            Icons.history_outlined,
            color: colorScheme.onSurface.withValues(alpha: 0.32),
            size: 24,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '暂无企业群发记录',
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurface.withValues(alpha: 0.56),
              ),
            ),
          ),
          _StatusPill(
            label: '接口待接入',
            color: colorScheme.onSurface.withValues(alpha: 0.52),
          ),
        ],
      ),
    );
  }
}

class _EnterpriseBroadcastNoPermission extends StatelessWidget {
  const _EnterpriseBroadcastNoPermission();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.lock_outline,
              size: 48,
              color: colorScheme.onSurface.withValues(alpha: 0.24),
            ),
            const SizedBox(height: 12),
            Text(
              '无企业群发权限',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '企业群发仅面向管理员和所有者。',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurface.withValues(alpha: 0.52),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PreviewRow extends StatelessWidget {
  final String label;
  final String value;

  const _PreviewRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 72,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: colorScheme.onSurface.withValues(alpha: 0.52),
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget? trailing;

  const _SectionTitle({
    required this.icon,
    required this.title,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Icon(icon, color: _primary, size: 20),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface,
            ),
          ),
        ),
        if (trailing != null) trailing!,
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  final String label;
  final Color color;

  const _StatusPill({
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

class _EnterpriseBroadcastCard extends StatelessWidget {
  final Widget child;

  const _EnterpriseBroadcastCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: child,
    );
  }
}

InputDecoration _inputDecoration(
  BuildContext context, {
  required String hintText,
}) {
  final colorScheme = Theme.of(context).colorScheme;
  return InputDecoration(
    hintText: hintText,
    hintStyle: TextStyle(
      color: colorScheme.onSurface.withValues(alpha: 0.38),
    ),
    filled: true,
    fillColor: Theme.of(context).scaffoldBackgroundColor,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: BorderSide(color: Theme.of(context).dividerColor),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: BorderSide(color: Theme.of(context).dividerColor),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: _primary),
    ),
  );
}
